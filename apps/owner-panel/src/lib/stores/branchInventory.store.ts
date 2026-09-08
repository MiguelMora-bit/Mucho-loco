import type { BranchInventoryLevel } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { inventoryTransferRepository } from '../repositories/inventoryTransfer.repository';

export const useBranchInventoryStore = createAsyncResourceStore<BranchInventoryLevel[]>(() =>
  inventoryTransferRepository.getBranchInventory()
);
