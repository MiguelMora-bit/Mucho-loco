import type { BranchStatsSummary } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { statsRepository } from '../repositories/stats.repository';

export const useBranchStatsStore = createAsyncResourceStore<BranchStatsSummary[]>(() =>
  statsRepository.getBranchStats()
);
