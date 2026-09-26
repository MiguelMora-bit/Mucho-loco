import type { AccessAlert, BranchStatsSummary, GlobalInventoryItem } from '@mucho-loco/types';
import { ACCESS_ALERTS, BRANCH_STATS, BRANCH_INVENTORY } from '../../data';
import { delay } from './delay';
import type { IStatsRepository } from '../../repositories/stats.repository';

export class StatsMockDatasource implements IStatsRepository {
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

  async getAccessAlerts(): Promise<AccessAlert[]> {
    await delay(120);
    return [...ACCESS_ALERTS].sort((a, b) => b.at.localeCompare(a.at));
  }
}
