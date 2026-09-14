import type { BranchSalesReport } from '@mucho-loco/types';
import { COUNTER_SALES, MEMBERSHIP_PAYMENTS } from '../../data';
import { calculateSalesReport } from '../../reports';
import { delay } from './delay';
import type { IReportsRepository } from '../../repositories/reports.repository';

export class ReportsMockDatasource implements IReportsRepository {
  async getSalesReport(branchId: number, days: number): Promise<BranchSalesReport> {
    await delay(180);
    return calculateSalesReport(branchId, days, COUNTER_SALES, MEMBERSHIP_PAYMENTS);
  }
}
