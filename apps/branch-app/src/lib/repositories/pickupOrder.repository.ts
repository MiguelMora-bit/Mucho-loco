import type { PickupOrder } from '@mucho-loco/types';
import { PickupOrderMockDatasource } from '../datasources/mock/pickupOrder.mock';
import { PickupOrderHttpDatasource } from '../datasources/http/pickupOrder.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IPickupOrderRepository {
  getByBranch(branchId: number): Promise<PickupOrder[]>;
  markDelivered(orderId: string): Promise<PickupOrder>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const pickupOrderRepository: IPickupOrderRepository = isHttpDatasourceEnabled()
  ? new PickupOrderHttpDatasource()
  : new PickupOrderMockDatasource();
