import { describe, it, expect } from 'vitest';
import { calculateISR, calculateIMSS, calculatePayroll, nextPeriodRange, periodContaining } from './payroll';

describe('payroll deduction calculations', () => {
  it('zero days worked produces zero gross and zero deductions', () => {
    expect(calculatePayroll(850, 0)).toEqual({ grossPay: 0, isrDeduction: 0, imssDeduction: 0, netPay: 0 });
  });

  it('gross pay landing exactly on a bracket boundary (6000) taxes only up to that boundary', () => {
    const result = calculatePayroll(500, 12); // 6000 exactly
    expect(result).toEqual({ grossPay: 6000, isrDeduction: 375, imssDeduction: 150, netPay: 5475 });
  });

  it('a high gross pay spans every bracket, including the top unbounded one', () => {
    const result = calculatePayroll(850, 16); // 13600, above the 12000 top boundary
    expect(result).toEqual({ grossPay: 13600, isrDeduction: 1595, imssDeduction: 340, netPay: 11665 });
  });

  it('calculateISR/calculateIMSS agree with calculatePayroll for the same gross pay', () => {
    const combined = calculatePayroll(9200, 1);
    expect(combined.isrDeduction).toBe(calculateISR(9200));
    expect(combined.imssDeduction).toBe(calculateIMSS(9200));
  });
});

// Same cases as the backend twin (apps/backend/src/payroll/payroll-periods.spec.ts).
describe('pay periods (spec 050)', () => {
  it('alternates 1st–15th and 16th–end of month', () => {
    expect(nextPeriodRange('2026-08-15')).toEqual({ startDate: '2026-08-16', endDate: '2026-08-31', totalDays: 16 });
    expect(nextPeriodRange('2026-08-31')).toEqual({ startDate: '2026-09-01', endDate: '2026-09-15', totalDays: 15 });
  });

  it('handles February and the turn of the year', () => {
    expect(nextPeriodRange('2028-02-15')).toEqual({ startDate: '2028-02-16', endDate: '2028-02-29', totalDays: 14 });
    expect(nextPeriodRange('2026-12-31')).toEqual({ startDate: '2027-01-01', endDate: '2027-01-15', totalDays: 15 });
  });

  it('snaps back to the calendar after an irregular period', () => {
    expect(nextPeriodRange('2026-09-10')).toEqual({ startDate: '2026-09-11', endDate: '2026-09-15', totalDays: 5 });
  });

  it('finds the period that contains a day', () => {
    expect(periodContaining('2026-09-26')).toEqual({ startDate: '2026-09-16', endDate: '2026-09-30', totalDays: 15 });
  });
});
