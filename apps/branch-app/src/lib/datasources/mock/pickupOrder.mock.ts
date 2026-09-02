import type { PickupOrder } from '@mucho-loco/types';
import { PICKUP_ORDERS } from '../../data';
import { delay } from './delay';

export class PickupOrderMockDatasource {
  async getByBranch(branchId: number): Promise<PickupOrder[]> {
    await delay(160);
    return PICKUP_ORDERS.filter((o) => o.branchId === branchId);
  }

  async markDelivered(orderId: string): Promise<PickupOrder> {
    await delay(120);
    const order = PICKUP_ORDERS.find((o) => o.id === orderId);
    if (!order) throw new Error(`Pickup order ${orderId} not found`);
    order.status = 'delivered';
    return order;
  }
}
