import type { BranchStatsSummary, GlobalInventoryItem } from '@mucho-loco/types';
import { StatsMockDatasource } from '../datasources/mock/stats.mock';
import { StatsHttpDatasource } from '../datasources/http/stats.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IStatsRepository {
  getBranchStats(): Promise<BranchStatsSummary[]>;
  getGlobalInventory(): Promise<GlobalInventoryItem[]>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const statsRepository: IStatsRepository = isHttpDatasourceEnabled()
  ? new StatsHttpDatasource()
  : new StatsMockDatasource();
