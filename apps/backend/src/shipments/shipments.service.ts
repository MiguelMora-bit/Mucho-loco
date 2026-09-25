import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ShipmentOrder, ShipmentStatus } from '@mucho-loco/types';
import type { Order as OrderRow, OrderItem as OrderItemRow, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { shippingAddressFromJson } from '../users/shipping-address';
import {
  notAHomeOrder,
  orderAlreadyDelivered,
  orderAlreadyShipped,
  orderNotPaid,
  orderNotShipped,
} from '../common/error-codes';

type ShipmentRow = OrderRow & { items: OrderItemRow[]; user: User };

function shipmentStatus(row: OrderRow): ShipmentStatus {
  if (row.status === 'shipped') return 'shipped';
  if (row.status === 'done') return 'delivered';
  return 'to_ship';
}

/**
 * Un pedido a domicilio visto por bodega. Igual que `PickupOrder`, NO es un
 * modelo aparte: es el MISMO `Order` que creó el socio, mirado desde la bodega.
 */
function toShipment(row: ShipmentRow): ShipmentOrder {
  return {
    id: row.id,
    customerName: row.user.name,
    items: row.items.map((i) => ({ name: i.name, flav: i.flav, img: i.img, qty: i.qty })),
    total: row.total,
    status: shipmentStatus(row),
    address: shippingAddressFromJson(row.shippingAddress) ?? null,
    trackingNumber: row.trackingNumber ?? undefined,
    placedAt: row.createdAt.toISOString(),
    shippedAt: row.shippedAt?.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString(),
  };
}

const WITH_DETAILS = { items: true, user: true } as const;

@Injectable()
export class ShipmentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Solo pedidos a domicilio ya cobrados. `pending_payment` es una sesión de
   * Stripe sin pagar: mandarlo sería regalarlo. El más viejo primero, porque
   * es el que lleva más tiempo esperando.
   */
  async getAll(): Promise<ShipmentOrder[]> {
    const rows = await this.prisma.order.findMany({
      where: { delivery: 'home', status: { in: ['ready', 'shipped', 'done'] } },
      include: WITH_DETAILS,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toShipment);
  }

  /** Bodega se lo dio a la paquetería. La guía es opcional: no todas las entregas la tienen. */
  async markShipped(orderId: string, trackingNumber?: string): Promise<ShipmentOrder> {
    const order = await this.findHomeOrder(orderId);
    if (order.status === 'pending_payment') throw new BadRequestException(orderNotPaid(orderId));
    if (order.status === 'shipped') throw new BadRequestException(orderAlreadyShipped(orderId));
    if (order.status === 'done') throw new BadRequestException(orderAlreadyDelivered(orderId));

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'shipped', shippedAt: new Date(), trackingNumber: trackingNumber?.trim() || null },
      include: WITH_DETAILS,
    });
    // Spec 008: "tu pedido va en camino". Después de guardar, y un aviso que
    // falla no deshace un envío que sí salió de bodega.
    await this.notifications.notifyOrderShipped(orderId).catch(() => undefined);
    return toShipment(updated);
  }

  /** Llegó. Solo lo que ya salió de bodega: un pedido no se "entrega" sin haberse enviado. */
  async markDelivered(orderId: string): Promise<ShipmentOrder> {
    const order = await this.findHomeOrder(orderId);
    if (order.status === 'done') throw new BadRequestException(orderAlreadyDelivered(orderId));
    if (order.status !== 'shipped') throw new BadRequestException(orderNotShipped(orderId));

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'done', deliveredAt: new Date() },
      include: WITH_DETAILS,
    });
    return toShipment(updated);
  }

  private async findHomeOrder(orderId: string): Promise<OrderRow> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order not found: ${orderId}`);
    if (order.delivery !== 'home') throw new BadRequestException(notAHomeOrder(orderId));
    return order;
  }
}
