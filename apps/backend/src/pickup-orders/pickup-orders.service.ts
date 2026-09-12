import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PickupOrder } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Order as OrderRow, OrderItem as OrderItemRow, User } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

  async getByBranch(branchId: number): Promise<PickupOrder[]> {
    const rows = await this.prisma.order.findMany({
      where: { branchId, delivery: 'pickup' },
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
      throw new BadRequestException(`Order ${orderId} no es de recoger en gym`);
    }
    if (order.status === 'done') {
      throw new BadRequestException(`Pickup order already delivered: ${orderId}`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'done', deliveredAt: new Date() },
      include: { items: true, user: true },
    });
    return toPickupOrder(updated);
  }
}
