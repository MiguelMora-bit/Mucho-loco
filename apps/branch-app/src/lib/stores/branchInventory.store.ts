import type { BranchInventoryLevel } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { counterSaleRepository } from '../repositories/counterSale.repository';
import { CURRENT_BRANCH_ID } from '../currentBranch';

export const useBranchInventoryStore = createAsyncResourceStore<BranchInventoryLevel[]>(() =>
  counterSaleRepository.getInventory(CURRENT_BRANCH_ID)
);
