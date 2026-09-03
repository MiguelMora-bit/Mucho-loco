import { describe, it, expect } from 'vitest';
import { payrollRepository, PeriodAlreadyClosedError } from './payroll.repository';
import { calculatePayroll } from '../payroll';
import { EMPLOYEES, PAYROLL_PERIODS, ATTENDANCE_SUMMARIES, PAYSLIPS } from '../data';

describe('payrollRepository', () => {
  it('getEmployees returns every mock employee', async () => {
    expect(await payrollRepository.getEmployees()).toHaveLength(EMPLOYEES.length);
  });

  it('getPeriods returns both quincenas', async () => {
    expect(await payrollRepository.getPeriods()).toHaveLength(PAYROLL_PERIODS.length);
  });

  it('getAttendance returns every attendance row across both periods', async () => {
    expect(await payrollRepository.getAttendance()).toHaveLength(ATTENDANCE_SUMMARIES.length);
  });

  it('getPayslips returns only the pre-generated closed-period payslips before any run', async () => {
    expect(await payrollRepository.getPayslips()).toHaveLength(PAYSLIPS.length);
  });

  it('runPayroll on the open period produces payslips matching payroll.ts math, and closes it', async () => {
    const openPeriod = PAYROLL_PERIODS.find((p) => p.status === 'open')!;
    const attendanceCount = ATTENDANCE_SUMMARIES.filter((a) => a.periodId === openPeriod.id).length;
    const before = (await payrollRepository.getPayslips()).length;

    const result = await payrollRepository.runPayroll(openPeriod.id);
    expect(result).toHaveLength(attendanceCount);

    const sample = result.find((p) => p.employeeId === 'emp-1')!;
    const expected = calculatePayroll(850, sample.daysWorked); // emp-1's dailyRate is 850
    expect(sample.grossPay).toBe(expected.grossPay);
    expect(sample.isrDeduction).toBe(expected.isrDeduction);
    expect(sample.imssDeduction).toBe(expected.imssDeduction);
    expect(sample.netPay).toBe(expected.netPay);

    expect(await payrollRepository.getPayslips()).toHaveLength(before + attendanceCount);
    const updated = (await payrollRepository.getPeriods()).find((p) => p.id === openPeriod.id)!;
    expect(updated.status).toBe('closed');
  });

  it('runPayroll rejects a period that was already closed from the start', async () => {
    const closedFromSeed = PAYROLL_PERIODS.find((p) => p.id === 'period-1')!;
    await expect(payrollRepository.runPayroll(closedFromSeed.id)).rejects.toThrow(PeriodAlreadyClosedError);
  });

  it('running the same period twice rejects the second time', async () => {
    // The 'open' period from the earlier test is now closed — this exercises
    // the exact same guard via the "double run" path rather than the
    // seeded-closed path above.
    const nowClosed = PAYROLL_PERIODS.find((p) => p.id === 'period-2')!;
    await expect(payrollRepository.runPayroll(nowClosed.id)).rejects.toThrow(PeriodAlreadyClosedError);
  });
});
