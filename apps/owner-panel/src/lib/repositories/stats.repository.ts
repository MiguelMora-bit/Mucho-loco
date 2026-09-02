import type { BranchStatsSummary, GlobalInventoryItem } from '@mucho-loco/types';
import { StatsMockDatasource } from '../datasources/mock/stats.mock';

export interface IStatsRepository {
  getBranchStats(): Promise<BranchStatsSummary[]>;
  getGlobalInventory(): Promise<GlobalInventoryItem[]>;
}

// Swap this line to plug in a real API datasource
export const statsRepository: IStatsRepository = new StatsMockDatasource();
