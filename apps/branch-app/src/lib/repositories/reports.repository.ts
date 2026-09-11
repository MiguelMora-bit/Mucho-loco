import type { BranchSalesReport } from '@mucho-loco/types';
import { ReportsMockDatasource } from '../datasources/mock/reports.mock';

export interface IReportsRepository {
  getSalesReport(branchId: number, days: number): Promise<BranchSalesReport>;
}

// Swap this line to plug in a real API datasource
export const reportsRepository: IReportsRepository = new ReportsMockDatasource();
