import type { BranchSalesReport } from '@mucho-loco/types';
import { ReportsMockDatasource } from '../datasources/mock/reports.mock';
import { ReportsHttpDatasource } from '../datasources/http/reports.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IReportsRepository {
  getSalesReport(branchId: number, days: number): Promise<BranchSalesReport>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const reportsRepository: IReportsRepository = isHttpDatasourceEnabled()
  ? new ReportsHttpDatasource()
  : new ReportsMockDatasource();
