import type { BranchInventoryLevel, InventoryTransfer } from '@mucho-loco/types';
import { InventoryTransferMockDatasource } from '../datasources/mock/inventoryTransfer.mock';
import { InventoryTransferHttpDatasource } from '../datasources/http/inventoryTransfer.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';
import type { CreateTransferInput } from '../datasources/mock/inventoryTransfer.mock';

export { InsufficientStockError, SameBranchError } from './inventoryTransfer.errors';
export type { CreateTransferInput };

export interface IInventoryTransferRepository {
  getBranchInventory(): Promise<BranchInventoryLevel[]>;
  getAll(): Promise<InventoryTransfer[]>;
  create(input: CreateTransferInput): Promise<InventoryTransfer>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const inventoryTransferRepository: IInventoryTransferRepository = isHttpDatasourceEnabled()
  ? new InventoryTransferHttpDatasource()
  : new InventoryTransferMockDatasource();
