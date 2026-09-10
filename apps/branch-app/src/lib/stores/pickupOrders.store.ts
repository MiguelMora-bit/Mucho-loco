import type { PickupOrder } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { pickupOrderRepository } from '../repositories/pickupOrder.repository';
import { getCurrentBranchId } from '../currentBranch';

export const usePickupOrdersStore = createAsyncResourceStore<PickupOrder[]>(() =>
  pickupOrderRepository.getByBranch(getCurrentBranchId())
);
