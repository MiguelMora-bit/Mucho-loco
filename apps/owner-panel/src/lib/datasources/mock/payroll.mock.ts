import type { AttendanceSummary, Employee, PayrollPeriod, Payslip } from '@mucho-loco/types';
import { EMPLOYEES, PAYROLL_PERIODS, ATTENDANCE_SUMMARIES, PAYSLIPS } from '../../data';
import { delay } from './delay';
import { calculatePayroll, nextPeriodRange, periodContaining, type PeriodRange } from '../../payroll';
import {
  PeriodNotFoundError,
  PeriodAlreadyClosedError,
  PeriodAlreadyOpenError,
} from '../../repositories/payroll.errors';
import type { IPayrollRepository } from '../../repositories/payroll.repository';

const MEXICO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' });

function openPeriod(range: PeriodRange): PayrollPeriod {
  const period: PayrollPeriod = { id: `period-${range.startDate}`, ...range, status: 'open' };
  PAYROLL_PERIODS.push(period);
  return period;
}

export class PayrollMockDatasource implements IPayrollRepository {
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
    // Like the backend (spec 050): the next period opens in the same step,
    // unless a later one already exists.
    if (!PAYROLL_PERIODS.some((p) => p.startDate > period.endDate)) {
      openPeriod(nextPeriodRange(period.endDate));
    }
    return newPayslips;
  }

  async openNextPeriod(): Promise<PayrollPeriod> {
    await delay(200);
    const open = PAYROLL_PERIODS.find((p) => p.status === 'open');
    if (open) throw new PeriodAlreadyOpenError(open.id);
    const latest = PAYROLL_PERIODS.reduce<PayrollPeriod | null>(
      (last, p) => (!last || p.endDate > last.endDate ? p : last),
      null,
    );
    return openPeriod(latest ? nextPeriodRange(latest.endDate) : periodContaining(MEXICO_DAY.format(new Date())));
  }
}
