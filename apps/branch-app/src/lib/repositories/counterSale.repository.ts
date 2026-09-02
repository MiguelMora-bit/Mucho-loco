import type { BranchInventoryLevel, CounterSale, PaymentMethod } from '@mucho-loco/types';
import { CounterSaleMockDatasource } from '../datasources/mock/counterSale.mock';

export { ProductNotFoundError, InsufficientStockError } from './counterSale.errors';

export interface ICounterSaleRepository {
  getInventory(branchId: number): Promise<BranchInventoryLevel[]>;
  createSale(
    branchId: number,
    picks: Array<{ productId: string; qty: number }>,
    paymentMethod: PaymentMethod
  ): Promise<CounterSale>;
}

// Swap this line to plug in a real API datasource
export const counterSaleRepository: ICounterSaleRepository = new CounterSaleMockDatasource();
