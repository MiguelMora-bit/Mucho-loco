import type { InventoryTransfer } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { inventoryTransferRepository } from '../repositories/inventoryTransfer.repository';

export const useInventoryTransfersStore = createAsyncResourceStore<InventoryTransfer[]>(() =>
  inventoryTransferRepository.getAll()
);
