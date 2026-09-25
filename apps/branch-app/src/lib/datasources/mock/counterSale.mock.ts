import type { BranchInventoryLevel, CardType, CounterSale, CounterSaleItem, PaymentMethod } from '@mucho-loco/types';
import { BRANCH_INVENTORY, COUNTER_SALES } from '../../data';
import { delay } from './delay';
import { ProductNotFoundError, InsufficientStockError } from '../../repositories/counterSale.errors';
import type { ICounterSaleRepository } from '../../repositories/counterSale.repository';

export class CounterSaleMockDatasource implements ICounterSaleRepository {
  async getInventory(branchId: number): Promise<BranchInventoryLevel[]> {
    await delay(150);
    return BRANCH_INVENTORY.filter((i) => i.branchId === branchId);
  }

  async createSale(
    branchId: number,
    picks: Array<{ productId: string; qty: number }>,
    paymentMethod: PaymentMethod,
    cardType?: CardType
  ): Promise<CounterSale> {
    await delay(220);
    const items: CounterSaleItem[] = picks.map((pick) => {
      const stock = BRANCH_INVENTORY.find((i) => i.branchId === branchId && i.productId === pick.productId);
      if (!stock) throw new ProductNotFoundError(pick.productId);
      if (stock.qty < pick.qty) throw new InsufficientStockError(stock.productName);
      stock.qty -= pick.qty;
      return { productId: stock.productId, productName: stock.productName, qty: pick.qty, unitPrice: stock.unitPrice };
    });
    const sale: CounterSale = {
      id: `#CS-${Date.now()}`,
      branchId,
      items,
      total: items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0),
      paymentMethod,
      ...(paymentMethod === 'card' && cardType ? { cardType } : {}),
      createdAt: new Date().toISOString(),
    };
    COUNTER_SALES.push(sale);
    return sale;
  }
}
