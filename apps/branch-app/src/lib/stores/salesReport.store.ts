import type { BranchSalesReport } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { reportsRepository } from '../repositories/reports.repository';
import { getCurrentBranchId } from '../currentBranch';

export const REPORT_WINDOW_DAYS = 7;

export const useSalesReportStore = createAsyncResourceStore<BranchSalesReport>(() =>
  reportsRepository.getSalesReport(getCurrentBranchId(), REPORT_WINDOW_DAYS)
);
