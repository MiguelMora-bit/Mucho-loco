import type { ExecutiveReport } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { statsRepository } from '../repositories/stats.repository';
import { expensesRepository } from '../repositories/expenses.repository';
import { payrollRepository } from '../repositories/payroll.repository';
import { calculateExecutiveReport } from '../executiveReport';

export const useExecutiveReportStore = createAsyncResourceStore<ExecutiveReport>(async () => {
  const [branchStats, expenses, payslips] = await Promise.all([
    statsRepository.getBranchStats(),
    expensesRepository.getAll(),
    payrollRepository.getPayslips(),
  ]);
  return calculateExecutiveReport(branchStats, expenses, payslips);
});
