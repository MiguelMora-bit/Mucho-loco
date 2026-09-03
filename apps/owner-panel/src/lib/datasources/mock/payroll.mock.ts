import type { AttendanceSummary, Employee, PayrollPeriod, Payslip } from '@mucho-loco/types';
import { EMPLOYEES, PAYROLL_PERIODS, ATTENDANCE_SUMMARIES, PAYSLIPS } from '../../data';
import { delay } from './delay';
import { calculatePayroll } from '../../payroll';
import { PeriodNotFoundError, PeriodAlreadyClosedError } from '../../repositories/payroll.errors';

export class PayrollMockDatasource {
  async getEmployees(): Promise<Employee[]> {
    await delay(150);
    return EMPLOYEES;
  }

  async getPeriods(): Promise<PayrollPeriod[]> {
    await delay(120);
    return PAYROLL_PERIODS;
  }

  async getAttendance(): Promise<AttendanceSummary[]> {
    await delay(150);
    return ATTENDANCE_SUMMARIES;
  }

  async getPayslips(): Promise<Payslip[]> {
    await delay(150);
    return PAYSLIPS;
  }

  async runPayroll(periodId: string): Promise<Payslip[]> {
    await delay(400);
    const period = PAYROLL_PERIODS.find((p) => p.id === periodId);
    if (!period) throw new PeriodNotFoundError(periodId);
    if (period.status === 'closed') throw new PeriodAlreadyClosedError(periodId);

    const generatedAt = new Date().toISOString();
    const newPayslips: Payslip[] = ATTENDANCE_SUMMARIES.filter((a) => a.periodId === periodId).map((a) => {
      const employee = EMPLOYEES.find((e) => e.id === a.employeeId)!;
      const { grossPay, isrDeduction, imssDeduction, netPay } = calculatePayroll(employee.dailyRate, a.daysWorked);
      return {
        id: `payslip-${periodId}-${employee.id}`,
        periodId,
        employeeId: employee.id,
        employeeName: employee.name,
        branchId: employee.branchId,
        role: employee.role,
        daysWorked: a.daysWorked,
        totalDays: period.totalDays,
        dailyRate: employee.dailyRate,
        grossPay,
        isrDeduction,
        imssDeduction,
        netPay,
        generatedAt,
      };
    });

    PAYSLIPS.push(...newPayslips);
    period.status = 'closed';
    return newPayslips;
  }
}
