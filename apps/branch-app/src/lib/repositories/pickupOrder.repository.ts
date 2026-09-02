import type { PickupOrder } from '@mucho-loco/types';
import { PickupOrderMockDatasource } from '../datasources/mock/pickupOrder.mock';

export interface IPickupOrderRepository {
  getByBranch(branchId: number): Promise<PickupOrder[]>;
  markDelivered(orderId: string): Promise<PickupOrder>;
}

// Swap this line to plug in a real API datasource
export const pickupOrderRepository: IPickupOrderRepository = new PickupOrderMockDatasource();
