import type { PickupOrder } from '@mucho-loco/types';
import type { IPickupOrderRepository } from '../../repositories/pickupOrder.repository';
import { api } from './client';

/**
 * Pedidos "recoger en gym". El backend NO tiene una tabla aparte para esto:
 * es el MISMO `Order` que creó el socio en la tienda, visto desde mostrador
 * (ver `pickup-orders.service.ts`). Con mocks aislados ese pedido nunca
 * llegaba hasta acá.
 */
export class PickupOrderHttpDatasource implements IPickupOrderRepository {
  getByBranch(branchId: number): Promise<PickupOrder[]> {
    return api.get<PickupOrder[]>(`/branches/${branchId}/pickup-orders`);
  }

  markDelivered(orderId: string): Promise<PickupOrder> {
    return api.post<PickupOrder>(`/pickup-orders/${orderId}/deliver`);
  }
}
