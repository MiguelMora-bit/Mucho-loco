import { describe, it, expect } from 'vitest';
import { reportsRepository } from './reports.repository';

describe('reportsRepository', () => {
  it('getSalesReport scopes the report to the requested branch and window', async () => {
    const report = await reportsRepository.getSalesReport(1, 7);
    expect(report.branchId).toBe(1);
    expect(report.days).toBe(7);
    expect(report.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(report.transactionCount).toBeGreaterThanOrEqual(0);
  });

  it('getSalesReport returns an empty report for a branch with no activity', async () => {
    const report = await reportsRepository.getSalesReport(999, 7);
    expect(report.totalRevenue).toBe(0);
    expect(report.transactionCount).toBe(0);
    expect(report.byDay).toEqual([]);
    expect(report.topProducts).toEqual([]);
  });
});
