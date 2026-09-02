import { describe, it, expect } from 'vitest';
import { statsRepository } from './stats.repository';
import { BRANCH_STATS, GLOBAL_INVENTORY } from '../data';

describe('statsRepository', () => {
  it('getBranchStats returns every mock branch row', async () => {
    const stats = await statsRepository.getBranchStats();
    expect(stats).toHaveLength(BRANCH_STATS.length);
  });

  it('getGlobalInventory returns every mock inventory row', async () => {
    const inventory = await statsRepository.getGlobalInventory();
    expect(inventory).toHaveLength(GLOBAL_INVENTORY.length);
  });
});
