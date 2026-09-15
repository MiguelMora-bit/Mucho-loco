import type { ShipmentOrder } from '@mucho-loco/types';
import type { IShipmentsRepository } from '../../repositories/shipments.repository';
import { ShipmentStateError, type ShipmentStateReason } from '../../repositories/shipments.errors';
import { ApiRequestError, api } from './client';

const REASON_BY_CODE: Record<string, ShipmentStateReason> = {
  ORDER_ALREADY_SHIPPED: 'already_shipped',
  ORDER_NOT_SHIPPED: 'not_shipped',
  ORDER_ALREADY_DELIVERED: 'already_delivered',
  ORDER_NOT_PAID: 'not_paid',
};

/** Traduce el código del backend al error tipado que promete el contrato. */
function toDomainError(e: unknown, orderId: string): unknown {
  if (!(e instanceof ApiRequestError) || !e.code) return e;
  const reason = REASON_BY_CODE[e.code];
  return reason ? new ShipmentStateError(orderId, reason) : e;
}

export class ShipmentsHttpDatasource implements IShipmentsRepository {
  getAll(): Promise<ShipmentOrder[]> {
    return api.get<ShipmentOrder[]>('/shipments');
  }

  async markShipped(orderId: string, trackingNumber?: string): Promise<ShipmentOrder> {
    try {
      return await api.post<ShipmentOrder>(
        `/shipments/${encodeURIComponent(orderId)}/ship`,
        trackingNumber ? { trackingNumber } : {},
      );
    } catch (e) {
      throw toDomainError(e, orderId);
    }
  }

  async markDelivered(orderId: string): Promise<ShipmentOrder> {
    try {
      return await api.post<ShipmentOrder>(`/shipments/${encodeURIComponent(orderId)}/deliver`, {});
    } catch (e) {
      throw toDomainError(e, orderId);
    }
  }
}
