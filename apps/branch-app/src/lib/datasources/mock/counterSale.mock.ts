import type { BranchInventoryLevel, CounterSale, CounterSaleItem, PaymentMethod } from '@mucho-loco/types';
import { BRANCH_INVENTORY } from '../../data';
import { delay } from './delay';
import { ProductNotFoundError, InsufficientStockError } from '../../repositories/counterSale.errors';

export class CounterSaleMockDatasource {
  async getInventory(branchId: number): Promise<BranchInventoryLevel[]> {
    await delay(150);
    return BRANCH_INVENTORY.filter((i) => i.branchId === branchId);
  }

  async createSale(
    branchId: number,
    picks: Array<{ productId: string; qty: number }>,
    paymentMethod: PaymentMethod
  ): Promise<CounterSale> {
    await delay(220);
    const items: CounterSaleItem[] = picks.map((pick) => {
      const stock = BRANCH_INVENTORY.find((i) => i.branchId === branchId && i.productId === pick.productId);
      if (!stock) throw new ProductNotFoundError(pick.productId);
      if (stock.qty < pick.qty) throw new InsufficientStockError(stock.productName);
      stock.qty -= pick.qty;
      return { productId: stock.productId, productName: stock.productName, qty: pick.qty, unitPrice: stock.unitPrice };
    });
    return {
      id: `#CS-${Date.now()}`,
      branchId,
      items,
      total: items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0),
      paymentMethod,
      createdAt: new Date().toISOString(),
    };
  }
}
