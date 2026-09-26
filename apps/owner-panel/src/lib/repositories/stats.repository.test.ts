import { describe, it, expect } from 'vitest';
import { statsRepository } from './stats.repository';
import { BRANCH_STATS, BRANCH_INVENTORY } from '../data';

describe('statsRepository', () => {
  it('getBranchStats returns every mock branch row', async () => {
    const stats = await statsRepository.getBranchStats();
    expect(stats).toHaveLength(BRANCH_STATS.length);
  });

  it('getGlobalInventory returns one row per product, summed across branches', async () => {
    const inventory = await statsRepository.getGlobalInventory();
    const uniqueProducts = new Set(BRANCH_INVENTORY.map((i) => i.productId));
    expect(inventory).toHaveLength(uniqueProducts.size);

    const whey = inventory.find((i) => i.productId === 'p1');
    const expectedWheyQty = BRANCH_INVENTORY.filter((i) => i.productId === 'p1').reduce((sum, i) => sum + i.qty, 0);
    expect(whey?.totalQty).toBe(expectedWheyQty);
  });

  // Spec 020: el mismo QR en dos sucursales el mismo día, la más reciente primero.
  it('getAccessAlerts lists the shared-QR alerts, newest first', async () => {
    const alerts = await statsRepository.getAccessAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.map((a) => a.at)).toEqual([...alerts.map((a) => a.at)].sort().reverse());
    expect(alerts[0]).toMatchObject({ firstBranch: 'Roma Sur', branch: 'Santa Fe' });
  });
});
