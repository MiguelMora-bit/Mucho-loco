import type { BranchStatsSummary, GlobalInventoryItem } from '@mucho-loco/types';
import { BRANCH_STATS, BRANCH_INVENTORY } from '../../data';
import { delay } from './delay';

export class StatsMockDatasource {
  async getBranchStats(): Promise<BranchStatsSummary[]> {
    await delay(180);
    return BRANCH_STATS;
  }

  async getGlobalInventory(): Promise<GlobalInventoryItem[]> {
    await delay(140);
    const byProduct = new Map<string, GlobalInventoryItem>();
    for (const level of BRANCH_INVENTORY) {
      const existing = byProduct.get(level.productId);
      if (existing) {
        existing.totalQty += level.qty;
      } else {
        byProduct.set(level.productId, { productId: level.productId, productName: level.productName, totalQty: level.qty });
      }
    }
    return Array.from(byProduct.values());
  }
}
