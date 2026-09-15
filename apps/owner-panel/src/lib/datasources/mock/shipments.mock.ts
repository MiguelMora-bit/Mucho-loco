import type { ShipmentOrder } from '@mucho-loco/types';
import { SHIPMENTS } from '../../data';
import { delay } from './delay';
import { ShipmentStateError } from '../../repositories/shipments.errors';
import type { IShipmentsRepository } from '../../repositories/shipments.repository';

/** Mismas transiciones que ShipmentsService del backend: por enviar → en camino → entregado. */
export class ShipmentsMockDatasource implements IShipmentsRepository {
  async getAll(): Promise<ShipmentOrder[]> {
    await delay(150);
    return SHIPMENTS.map((s) => ({ ...s }));
  }

  async markShipped(orderId: string, trackingNumber?: string): Promise<ShipmentOrder> {
    await delay(200);
    const shipment = this.find(orderId);
    if (shipment.status === 'shipped') throw new ShipmentStateError(orderId, 'already_shipped');
    if (shipment.status === 'delivered') throw new ShipmentStateError(orderId, 'already_delivered');
    shipment.status = 'shipped';
    shipment.shippedAt = new Date().toISOString();
    shipment.trackingNumber = trackingNumber?.trim() || undefined;
    return { ...shipment };
  }

  async markDelivered(orderId: string): Promise<ShipmentOrder> {
    await delay(200);
    const shipment = this.find(orderId);
    if (shipment.status === 'delivered') throw new ShipmentStateError(orderId, 'already_delivered');
    if (shipment.status !== 'shipped') throw new ShipmentStateError(orderId, 'not_shipped');
    shipment.status = 'delivered';
    shipment.deliveredAt = new Date().toISOString();
    return { ...shipment };
  }

  private find(orderId: string): ShipmentOrder {
    const shipment = SHIPMENTS.find((s) => s.id === orderId);
    if (!shipment) throw new Error(`Shipment not found: ${orderId}`);
    return shipment;
  }
}
