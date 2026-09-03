import { describe, it, expect } from 'vitest';
import { calculateISR, calculateIMSS, calculatePayroll } from './payroll';

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
