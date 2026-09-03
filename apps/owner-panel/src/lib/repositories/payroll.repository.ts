import type { AttendanceSummary, Employee, PayrollPeriod, Payslip } from '@mucho-loco/types';
import { PayrollMockDatasource } from '../datasources/mock/payroll.mock';

export { PeriodNotFoundError, PeriodAlreadyClosedError } from './payroll.errors';

export interface IPayrollRepository {
  getEmployees(): Promise<Employee[]>;
  getPeriods(): Promise<PayrollPeriod[]>;
  getAttendance(): Promise<AttendanceSummary[]>;
  getPayslips(): Promise<Payslip[]>;
  runPayroll(periodId: string): Promise<Payslip[]>;
}

// Swap this line to plug in a real API datasource
export const payrollRepository: IPayrollRepository = new PayrollMockDatasource();
