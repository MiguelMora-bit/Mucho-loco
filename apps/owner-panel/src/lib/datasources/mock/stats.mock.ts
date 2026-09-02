import type { BranchStatsSummary, GlobalInventoryItem } from '@mucho-loco/types';
import { BRANCH_STATS, GLOBAL_INVENTORY } from '../../data';
import { delay } from './delay';

export class StatsMockDatasource {
  async getBranchStats(): Promise<BranchStatsSummary[]> {
    await delay(180);
    return BRANCH_STATS;
  }

  async getGlobalInventory(): Promise<GlobalInventoryItem[]> {
    await delay(140);
    return GLOBAL_INVENTORY;
  }
}
