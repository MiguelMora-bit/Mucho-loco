import type { AttendanceSummary, Employee, PayrollPeriod, Payslip } from '@mucho-loco/types';
import { PayrollMockDatasource } from '../datasources/mock/payroll.mock';
import { PayrollHttpDatasource } from '../datasources/http/payroll.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export { PeriodNotFoundError, PeriodAlreadyClosedError, PeriodAlreadyOpenError } from './payroll.errors';

export interface IPayrollRepository {
  getEmployees(): Promise<Employee[]>;
  getPeriods(): Promise<PayrollPeriod[]>;
  getAttendance(): Promise<AttendanceSummary[]>;
  getPayslips(): Promise<Payslip[]>;
  /** Closes the period and opens the next one (spec 050). */
  runPayroll(periodId: string): Promise<Payslip[]>;
  /** Unsticks payroll when no period is open: opens the one after the latest. */
  openNextPeriod(): Promise<PayrollPeriod>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const payrollRepository: IPayrollRepository = isHttpDatasourceEnabled()
  ? new PayrollHttpDatasource()
  : new PayrollMockDatasource();
