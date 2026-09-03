import type { Employee } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { payrollRepository } from '../repositories/payroll.repository';

export const useEmployeesStore = createAsyncResourceStore<Employee[]>(() => payrollRepository.getEmployees());
