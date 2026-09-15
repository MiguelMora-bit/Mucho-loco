import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Cfdi, FiscalReceipt } from '@prisma/client';
import type { Invoice } from 'facturapi';
import { PrismaService } from '../prisma/prisma.service';
import { FacturapiService, type FacturapiEvent } from './facturapi.provider';
import {
  PAYMENT_FORM,
  cfdiFromInvoice,
  receiptItems,
  receiptStatus,
} from './fiscal-mapping';

/** Nombre del cron, para que un test lo apague (SchedulerRegistry) y corra el worker a mano. */
export const RECEIPTS_CRON = 'fiscal-receipts';

const BATCH_SIZE = 20;
/** Después de esto el recibo queda `failed` y lo tiene que ver alguien: ~1.5 días con el backoff de abajo. */
export const MAX_ATTEMPTS = 10;
const MINUTE_MS = 60_000;

/** 2, 4, 8… minutos, con tope de 6 horas. */
export const backoffMs = (attempts: number): number =>
  Math.min(2 ** attempts, 360) * MINUTE_MS;

/**
 * La cola hacia el PAC: da de alta en Facturapi el recibo de cada cobro, y
 * mantiene al día su estado con el webhook.
 *
 * El cobro NO llama a Facturapi: solo deja su fila en `pending`, dentro de su
 * transacción (ChargesService). Así un PAC caído no tumba una venta de
 * mostrador ni un webhook de Stripe — el recibo sale en el siguiente minuto,
 * o en el siguiente reintento.
 */
@Injectable()
export class FiscalReceiptsService {
  private readonly logger = new Logger(FiscalReceiptsService.name);

  constructor(
    private prisma: PrismaService,
    private facturapi: FacturapiService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: RECEIPTS_CRON })
  async tick(): Promise<void> {
    if (!this.facturapi.configured) return;
    const created = await this.processDue();
    if (created > 0)
      this.logger.log(`${created} recibos dados de alta en Facturapi`);
  }

  /**
   * Toma los recibos que tocan y los da de alta. Devuelve cuántos salieron.
   *
   * Tomar y arrendar es UNA sentencia: `FOR UPDATE SKIP LOCKED` hace que dos
   * instancias del backend (ECS puede correr varias) nunca tomen el mismo, y
   * empujar `nextAttemptAt` 5 minutos es el arriendo — la llamada a Facturapi
   * pasa FUERA de la transacción, sin dejar filas bloqueadas mientras tanto.
   * Si la instancia muere a la mitad, el recibo vuelve a tocar en 5 minutos.
   *
   * `now() AT TIME ZONE 'UTC'` y no `now()`: Prisma guarda las fechas en UTC
   * en columnas sin zona, y el `now()` de una sesión en hora de México
   * compararía seis horas corrido.
   */
  async processDue(limit = BATCH_SIZE): Promise<number> {
    const claimed = await this.prisma.$queryRaw<{ chargeId: string }[]>`
      UPDATE "fiscal_receipts"
      SET "nextAttemptAt" = (now() AT TIME ZONE 'UTC') + interval '5 minutes'
      WHERE "chargeId" IN (
        SELECT "chargeId" FROM "fiscal_receipts"
        WHERE "status" = 'pending' AND "nextAttemptAt" <= (now() AT TIME ZONE 'UTC')
        ORDER BY "nextAttemptAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "chargeId"`;

    let created = 0;
    for (const { chargeId } of claimed) {
      const receipt = await this.createReceipt(chargeId);
      if (
        receipt &&
        receipt.status !== 'pending' &&
        receipt.status !== 'failed'
      )
        created++;
    }
    return created;
  }

  /**
   * Da de alta el recibo de un cobro. Lo llama el worker, y también "Facturar"
   * cuando el socio llega antes que el worker. Devuelve el recibo como quedó;
   * null si el cobro no tiene recibo.
   *
   * Idempotente del lado de Facturapi (`idempotency_key` = id del cobro): si
   * el worker y "Facturar" llegan a la vez, o si el proceso muere después de
   * crearlo y antes de guardarlo, Facturapi devuelve el mismo recibo.
   */
  async createReceipt(chargeId: string): Promise<FiscalReceipt | null> {
    const charge = await this.prisma.charge.findUnique({
      where: { id: chargeId },
      include: { lines: true, fiscalReceipt: true },
    });
    const current = charge?.fiscalReceipt;
    if (!charge || !current) return null;
    if (current.status !== 'pending' && current.status !== 'failed')
      return current;

    try {
      const receipt = await this.facturapi.client.receipts.create({
        payment_form: PAYMENT_FORM[charge.method],
        items: receiptItems(charge.lines),
        external_id: charge.id,
        idempotency_key: charge.id,
      });
      return await this.prisma.fiscalReceipt.update({
        where: { chargeId },
        data: {
          status: receiptStatus(receipt.status) ?? 'open',
          attempts: current.attempts + 1,
          lastError: null,
          facturapiId: receipt.id,
          key: receipt.key,
          selfInvoiceUrl: receipt.self_invoice_url,
          expiresAt: receipt.expires_at ? new Date(receipt.expires_at) : null,
        },
      });
    } catch (e) {
      const attempts = current.attempts + 1;
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `Recibo del cobro ${chargeId}, intento ${attempts}: ${message}`,
      );
      return this.prisma.fiscalReceipt.update({
        where: { chargeId },
        data: {
          attempts,
          lastError: message.slice(0, 500),
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          nextAttemptAt: new Date(Date.now() + backoffMs(attempts)),
        },
      });
    }
  }

  /**
   * Webhook de Facturapi. Ningún evento se aplica tal cual llega — mismo
   * criterio que MembershipBillingService con Stripe: se vuelve a leer el
   * recibo o la factura, así que el orden de llegada no importa y reprocesar
   * un evento no cambia nada.
   */
  async handleEvent(event: FacturapiEvent): Promise<void> {
    const id = event.data?.object?.id;
    if (!id) return;
    switch (event.type) {
      // El socio se autofacturó en el portal con la clave del ticket, o el
      // recibo cambió de estado (entró a la global, se canceló).
      case 'receipt.self_invoice_complete':
      case 'receipt.status_updated':
        await this.syncReceipt(id);
        return;
      case 'invoice.global_invoice_created':
      case 'invoice.status_updated':
      case 'invoice.cancellation_status_updated':
        await this.syncInvoice(id);
        return;
      default:
        return;
    }
  }

  /** Copia el estado del recibo en Facturapi, y registra su factura si ya tiene. */
  async syncReceipt(facturapiId: string): Promise<FiscalReceipt | null> {
    const local = await this.prisma.fiscalReceipt.findUnique({
      where: { facturapiId },
    });
    // Un recibo que no es nuestro: de otro ambiente sobre la misma organización.
    if (!local) return null;

    const receipt = await this.facturapi.client.receipts.retrieve(facturapiId);
    const status = receiptStatus(receipt.status) ?? local.status;
    const cfdi = receipt.invoice
      ? await this.syncInvoice(receipt.invoice)
      : null;
    return this.prisma.fiscalReceipt.update({
      where: { facturapiId },
      data: {
        status,
        // De vuelta en `open` (se canceló su factura) ya no es de ninguna.
        cfdiId: cfdi?.id ?? (status === 'open' ? null : local.cfdiId),
      },
    });
  }

  async syncInvoice(invoiceId: string): Promise<Cfdi | null> {
    const invoice = await this.facturapi.client.invoices.retrieve(invoiceId);
    return this.upsertCfdi(invoice);
  }

  /**
   * Solo facturas timbradas: sin folio fiscal del SAT no hay CFDI que guardar.
   * El upsert por `facturapiId` es un INSERT … ON CONFLICT: el webhook y la
   * respuesta de "Facturar" pueden llegar a la vez con la misma factura.
   */
  async upsertCfdi(invoice: Invoice, userId?: string): Promise<Cfdi | null> {
    if (!invoice.uuid) return null;
    const data = cfdiFromInvoice(invoice);
    return this.prisma.cfdi.upsert({
      where: { facturapiId: invoice.id },
      create: { facturapiId: invoice.id, ...data, userId: userId ?? null },
      update: {
        status: data.status,
        cancellationStatus: data.cancellationStatus,
        ...(userId ? { userId } : {}),
      },
    });
  }

  /** "Facturar" desde la app: la factura y el recibo que la originó, juntos. */
  async recordInvoice(
    chargeId: string,
    invoice: Invoice,
    userId: string,
  ): Promise<Cfdi | null> {
    const cfdi = await this.upsertCfdi(invoice, userId);
    if (!cfdi) return null;
    await this.prisma.fiscalReceipt.update({
      where: { chargeId },
      data: { status: 'invoiced_to_customer', cfdiId: cfdi.id },
    });
    return cfdi;
  }
}
