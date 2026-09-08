import type { BranchInventoryLevel, InventoryTransfer } from '@mucho-loco/types';
import { InventoryTransferMockDatasource } from '../datasources/mock/inventoryTransfer.mock';
import type { CreateTransferInput } from '../datasources/mock/inventoryTransfer.mock';

export { InsufficientStockError, SameBranchError } from './inventoryTransfer.errors';
export type { CreateTransferInput };

export interface IInventoryTransferRepository {
  getBranchInventory(): Promise<BranchInventoryLevel[]>;
  getAll(): Promise<InventoryTransfer[]>;
  create(input: CreateTransferInput): Promise<InventoryTransfer>;
}

// Swap this line to plug in a real API datasource
export const inventoryTransferRepository: IInventoryTransferRepository = new InventoryTransferMockDatasource();
