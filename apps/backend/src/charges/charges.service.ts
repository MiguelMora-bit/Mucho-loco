import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { LocalizedString } from '@mucho-loco/types';
import type {
  ChargeMethod,
  ChargeSource,
  CounterSale,
  CounterSaleItem,
  Order,
  OrderItem,
  PlanKey,
  Prisma,
  TierKey,
} from '@prisma/client';
import { PERIOD_NAME } from '../memberships/membership-plans';

/** El catálogo guarda pesos enteros; el registro de cobros, centavos. */
export const toCents = (pesos: number): number => Math.round(pesos * 100);

type Tx = Prisma.TransactionClient;

/** El envío es concepto aparte en la factura, con su propia categoría. */
const SHIPPING_CATEGORY = 'shipping';
/** Lo que no se puede clasificar: pedidos anteriores a OrderItem.productId, o un producto que ya no existe. */
const UNCLASSIFIED_CATEGORY = 'unclassified';

/** A qué fila de su canal pertenece el cobro. Exactamente una: CHECK en la base. */
export type ChargeOrigin =
  | { orderId: string }
  | { counterSaleId: string }
  | { membershipPaymentId: string }
  | { membershipPurchaseId: string }
  | { stripeInvoiceId: string };

interface LineInput {
  description: string;
  qty: number;
  unitPriceCents: number;
  taxCategoryId: string;
}

interface ChargeInput {
  source: ChargeSource;
  method: ChargeMethod;
  paidAt: Date;
  branchId: number | null;
  userId: string | null;
  totalCents: number;
  origin: ChargeOrigin;
  lines: LineInput[];
}

export interface MembershipChargeInput {
  source: Extract<
    ChargeSource,
    'counter_membership' | 'membership_visit' | 'membership_subscription'
  >;
  method: ChargeMethod;
  paidAt: Date;
  userId: string;
  branchId: number;
  tierKey: TierKey;
  periodKey: PlanKey;
  totalCents: number;
  origin: ChargeOrigin;
}

/**
 * El único lugar que escribe en el registro de cobros. Cada canal lo llama
 * DENTRO de la misma transacción en la que confirma su cobro: así no puede
 * existir un pedido pagado sin su cobro registrado, ni un cobro de una venta
 * que se revirtió.
 *
 * Arma los renglones con su dato fiscal congelado (ver ChargeLine) — la clave
 * del SAT y la tasa de IVA que tenía la categoría el día del cobro.
 */
@Injectable()
export class ChargesService {
  /**
   * Pedido de tienda, cobrado por Stripe o en efectivo al entregarlo. Los
   * renglones son lo que se le cotizó al socio (OrderItem congelado) más el
   * envío, que es la diferencia contra el total — así no depende de que la
   * tarifa de envío siga siendo la misma que el día del pedido.
   */
  async recordOrder(
    tx: Tx,
    order: Order & { items: OrderItem[] },
    payment: { method: ChargeMethod; paidAt: Date },
  ): Promise<boolean> {
    const categories = await this.productCategories(
      tx,
      order.items.flatMap((i) => (i.productId ? [i.productId] : [])),
    );

    const lines: LineInput[] = [];
    for (const item of order.items) {
      if (item.unitPrice === null) {
        lines.length = 0;
        break;
      }
      lines.push({
        description: item.flav ? `${item.name} · ${item.flav}` : item.name,
        qty: item.qty,
        unitPriceCents: toCents(item.unitPrice),
        taxCategoryId:
          (item.productId && categories.get(item.productId)) ||
          UNCLASSIFIED_CATEGORY,
      });
    }

    const totalCents = toCents(order.total);
    if (lines.length === 0) {
      // Pedido anterior a que OrderItem guardara precio: no hay con qué
      // desglosarlo, así que va en un renglón sin clasificar por el total.
      lines.push({
        description: `Pedido ${order.id}`,
        qty: 1,
        unitPriceCents: totalCents,
        taxCategoryId: UNCLASSIFIED_CATEGORY,
      });
    } else {
      const shippingCents = totalCents - sumLines(lines);
      if (shippingCents > 0) {
        lines.push({
          description: 'Envío a domicilio',
          qty: 1,
          unitPriceCents: shippingCents,
          taxCategoryId: SHIPPING_CATEGORY,
        });
      }
    }

    return this.insert(tx, {
      source: 'order',
      method: payment.method,
      paidAt: payment.paidAt,
      branchId: order.branchId,
      userId: order.userId,
      totalCents,
      origin: { orderId: order.id },
      lines,
    });
  }

  /** Venta de mostrador. El cliente de mostrador no tiene cuenta: sin userId. */
  async recordCounterSale(
    tx: Tx,
    sale: CounterSale & { items: CounterSaleItem[] },
  ): Promise<boolean> {
    const categories = await this.productCategories(
      tx,
      sale.items.map((i) => i.productId),
    );
    return this.insert(tx, {
      source: 'counter_sale',
      method: sale.paymentMethod,
      paidAt: sale.createdAt,
      branchId: sale.branchId,
      userId: null,
      totalCents: toCents(sale.total),
      origin: { counterSaleId: sale.id },
      lines: sale.items.map((i) => ({
        description: i.productName,
        qty: i.qty,
        unitPriceCents: toCents(i.unitPrice),
        taxCategoryId: categories.get(i.productId) ?? UNCLASSIFIED_CATEGORY,
      })),
    });
  }

  /** Membresía: de mostrador, visita en línea, o un cobro de suscripción. */
  async recordMembership(
    tx: Tx,
    input: MembershipChargeInput,
  ): Promise<boolean> {
    const tier = await tx.membershipTier.findUniqueOrThrow({
      where: { key: input.tierKey },
    });
    const branch = await tx.branch.findUniqueOrThrow({
      where: { id: input.branchId },
    });
    const tierName = (tier.name as unknown as LocalizedString).es;

    return this.insert(tx, {
      ...input,
      lines: [
        {
          description: `Membresía ${PERIOD_NAME[input.periodKey]} · ${tierName} · ${branch.name}`,
          qty: 1,
          unitPriceCents: input.totalCents,
          taxCategoryId: tier.taxCategoryId,
        },
      ],
    });
  }

  /**
   * `createMany` con `skipDuplicates` (ON CONFLICT DO NOTHING) y no `create`:
   * dentro de una transacción interactiva, chocar con un índice único aborta
   * la transacción entera en Postgres. Así un webhook reentregado — o dos
   * entregas simultáneas — que intenta registrar el mismo cobro no hace nada.
   * Devuelve si lo registró.
   */
  private async insert(tx: Tx, input: ChargeInput): Promise<boolean> {
    // Una factura exige que sus conceptos sumen el total. Si no suman aquí, es
    // un bug de quien armó los renglones, y es mejor que truene ahora que en
    // el timbrado de fin de mes.
    const linesCents = sumLines(input.lines);
    if (linesCents !== input.totalCents) {
      throw new Error(
        `Los renglones del cobro suman ${linesCents} centavos y el total es ${input.totalCents}`,
      );
    }

    const categoryIds = [...new Set(input.lines.map((l) => l.taxCategoryId))];
    const categories = new Map(
      (
        await tx.taxCategory.findMany({ where: { id: { in: categoryIds } } })
      ).map((c) => [c.id, c]),
    );

    const id = randomUUID();
    const { count } = await tx.charge.createMany({
      data: [
        {
          id,
          source: input.source,
          method: input.method,
          totalCents: input.totalCents,
          paidAt: input.paidAt,
          branchId: input.branchId,
          userId: input.userId,
          ...input.origin,
        },
      ],
      skipDuplicates: true,
    });
    if (count === 0) return false;

    await tx.chargeLine.createMany({
      data: input.lines.map((line) => {
        const category = categories.get(line.taxCategoryId);
        if (!category) {
          throw new Error(
            `Categoría fiscal inexistente: ${line.taxCategoryId}`,
          );
        }
        return {
          chargeId: id,
          description: line.description,
          qty: line.qty,
          unitPriceCents: line.unitPriceCents,
          taxCategoryId: category.id,
          satProductKey: category.satProductKey,
          satUnitKey: category.satUnitKey,
          taxRateBp: category.taxRateBp,
        };
      }),
    });
    // Su lugar en la cola hacia el PAC (ver FiscalReceiptsService): en la
    // misma transacción, así que no existe un cobro sin su recibo por emitir.
    // La fecha va explícita, en UTC como todo lo que escribe Prisma: el worker
    // la compara contra `now() AT TIME ZONE 'UTC'`.
    await tx.fiscalReceipt.create({
      data: { chargeId: id, nextAttemptAt: new Date() },
    });
    return true;
  }

  private async productCategories(
    tx: Tx,
    productIds: string[],
  ): Promise<Map<string, string>> {
    if (productIds.length === 0) return new Map();
    const rows = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, taxCategoryId: true },
    });
    return new Map(rows.map((r) => [r.id, r.taxCategoryId]));
  }
}

function sumLines(lines: LineInput[]): number {
  return lines.reduce((sum, l) => sum + l.unitPriceCents * l.qty, 0);
}
