import type { BranchSalesReport } from '@mucho-loco/types';
import { COUNTER_SALES, MEMBERSHIP_PAYMENTS } from '../../data';
import { calculateSalesReport } from '../../reports';
import { delay } from './delay';

export class ReportsMockDatasource {
  async getSalesReport(branchId: number, days: number): Promise<BranchSalesReport> {
    await delay(180);
    return calculateSalesReport(branchId, days, COUNTER_SALES, MEMBERSHIP_PAYMENTS);
  }
}
