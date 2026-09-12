import type { BranchInventoryLevel, CounterSale, PaymentMethod } from '@mucho-loco/types';
import { CounterSaleMockDatasource } from '../datasources/mock/counterSale.mock';
import { CounterSaleHttpDatasource } from '../datasources/http/counterSale.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export { ProductNotFoundError, InsufficientStockError } from './counterSale.errors';

export interface ICounterSaleRepository {
  getInventory(branchId: number): Promise<BranchInventoryLevel[]>;
  createSale(
    branchId: number,
    picks: Array<{ productId: string; qty: number }>,
    paymentMethod: PaymentMethod
  ): Promise<CounterSale>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const counterSaleRepository: ICounterSaleRepository = isHttpDatasourceEnabled()
  ? new CounterSaleHttpDatasource()
  : new CounterSaleMockDatasource();
