import type { Payslip } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { payrollRepository } from '../repositories/payroll.repository';

export const usePayslipsStore = createAsyncResourceStore<Payslip[]>(() => payrollRepository.getPayslips());
