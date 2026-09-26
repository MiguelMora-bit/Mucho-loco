import type { AccessAlert } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { statsRepository } from '../repositories/stats.repository';

export const useAccessAlertsStore = createAsyncResourceStore<AccessAlert[]>(() =>
  statsRepository.getAccessAlerts()
);
