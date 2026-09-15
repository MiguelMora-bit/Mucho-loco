import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PickupOrder } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Order as OrderRow, OrderItem as OrderItemRow, User } from '@prisma/client';
import { notAPickupOrder, orderAlreadyDelivered, orderNotPaid } from '../common/error-codes';
import { ChargesService } from '../charges/charges.service';

/**
 * Un pedido "recoger en gym" visto por mostrador. NO es un modelo aparte: es
 * el MISMO `Order` que creó el socio en la tienda, mirado desde el otro lado
 * del mostrador. Ahí está el punto de tener una sola base — con mocks
 * aislados, el pedido que hacía customer-app nunca llegaba a branch-app.
 *
 * `status` se colapsa a dos valores porque a mostrador solo le importan dos:
 * está por entregar, o ya se entregó. Que además esté pendiente de pago
 * (efectivo al recoger) es una propiedad del cobro, no del mostrador.
 */
function toPickupOrder(row: OrderRow & { items: OrderItemRow[]; user: User }): PickupOrder {
  return {
    id: row.id,
    branchId: row.branchId as number,
    customerName: row.user.name,
    items: row.items.map((i) => ({ name: i.name, flav: i.flav, img: i.img, qty: i.qty })),
    total: row.total,
    status: row.status === 'done' ? 'delivered' : 'ready',
    placedAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class PickupOrdersService {
  constructor(
    private prisma: PrismaService,
    private charges: ChargesService,
  ) {}

  /**
   * Un pedido en línea que sigue en `pending_payment` es un checkout de
   * Stripe que nunca se pagó: no se lista, porque para mostrador no hay nada
   * que entregar. El efectivo pendiente sí — ese se cobra al entregarlo.
   */
  async getByBranch(branchId: number): Promise<PickupOrder[]> {
    const rows = await this.prisma.order.findMany({
      where: {
        branchId,
        delivery: 'pickup',
        OR: [{ status: { not: 'pending_payment' } }, { paymentMethod: 'cash' }],
      },
      include: { items: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toPickupOrder);
  }

  /**
   * Entregar es también el momento de cobrar cuando el pedido se pagó en
   * efectivo (ver "Pagos en línea" en el CLAUDE.md raíz: efectivo online solo
   * aplica con recoger en gym). Por eso el corte de caja cuenta estos pedidos
   * por `deliveredAt`, no por cuándo se hicieron — el dinero entra a la caja
   * de la sucursal en este instante, no cuando el socio le dio clic a comprar.
   */
  async markDelivered(orderId: string): Promise<PickupOrder> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Pickup order not found: ${orderId}`);
    if (order.delivery !== 'pickup') {
      throw new BadRequestException(notAPickupOrder(orderId));
    }
    if (order.status === 'done') {
      throw new BadRequestException(orderAlreadyDelivered(orderId));
    }
    // Pendiente de pago solo se entrega en efectivo, que se cobra aquí mismo.
    // Uno en línea sin pagar es un checkout abandonado: entregarlo sería
    // regalarlo, y no dejaría cobro en el registro.
    if (order.status === 'pending_payment' && order.paymentMethod !== 'cash') {
      throw new BadRequestException(orderNotPaid(orderId));
    }

    const deliveredAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id: orderId },
        data: { status: 'done', deliveredAt },
        include: { items: true, user: true },
      });
      // Uno pagado en línea ya quedó registrado cuando Stripe lo confirmó.
      if (order.paymentMethod === 'cash') {
        await this.charges.recordOrder(tx, row, { method: 'cash', paidAt: deliveredAt });
      }
      return row;
    });
    return toPickupOrder(updated);
  }
}
