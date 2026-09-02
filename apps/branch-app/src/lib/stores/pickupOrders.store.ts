import type { PickupOrder } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { pickupOrderRepository } from '../repositories/pickupOrder.repository';
import { CURRENT_BRANCH_ID } from '../currentBranch';

export const usePickupOrdersStore = createAsyncResourceStore<PickupOrder[]>(() =>
  pickupOrderRepository.getByBranch(CURRENT_BRANCH_ID)
);
