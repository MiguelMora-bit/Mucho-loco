import type { PayrollPeriod } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { payrollRepository } from '../repositories/payroll.repository';

export const usePayrollPeriodsStore = createAsyncResourceStore<PayrollPeriod[]>(() => payrollRepository.getPeriods());
