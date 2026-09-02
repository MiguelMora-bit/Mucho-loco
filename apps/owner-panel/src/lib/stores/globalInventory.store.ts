import type { GlobalInventoryItem } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { statsRepository } from '../repositories/stats.repository';

export const useGlobalInventoryStore = createAsyncResourceStore<GlobalInventoryItem[]>(() =>
  statsRepository.getGlobalInventory()
);
