import { describe, it, expect } from 'vitest';
import { calculateExecutiveReport } from './executiveReport';
import type { BranchStatsSummary, Expense, Payslip } from '@mucho-loco/types';

const branchStats: BranchStatsSummary[] = [
  { branchId: 1, branchName: 'Roma Sur', revenue: 100000, activeCustomers: 200, checkInsToday: 0, checkIns: 0 },
  { branchId: 2, branchName: 'Roma Norte', revenue: 50000, activeCustomers: 100, checkInsToday: 0, checkIns: 0 },
];

const expenses: Expense[] = [
  { id: 'e1', branchId: 1, category: 'rent', description: 'Renta', amount: 20000, date: '2026-08-01' },
  { id: 'e2', branchId: 1, category: 'utilities', description: 'Luz', amount: 5000, date: '2026-08-02' },
  { id: 'e3', branchId: 2, category: 'rent', description: 'Renta', amount: 15000, date: '2026-08-01' },
  { id: 'e4', branchId: null, category: 'marketing', description: 'Campaña nacional', amount: 8000, date: '2026-08-01' },
];

const payslips: Payslip[] = [
  { id: 'p1', periodId: 'period-1', employeeId: 'emp-1', employeeName: 'A', branchId: 1, role: 'manager', daysWorked: 15, totalDays: 15, dailyRate: 850, grossPay: 12750, isrDeduction: 1425, imssDeduction: 319, netPay: 11006, generatedAt: '2026-08-16T00:00:00.000Z' },
  { id: 'p2', periodId: 'period-1', employeeId: 'emp-2', employeeName: 'B', branchId: 2, role: 'counter', daysWorked: 15, totalDays: 15, dailyRate: 500, grossPay: 7500, isrDeduction: 600, imssDeduction: 188, netPay: 6712, generatedAt: '2026-08-16T00:00:00.000Z' },
];

describe('calculateExecutiveReport', () => {
  it('computes revenue minus expenses minus payroll cost per branch', () => {
    const report = calculateExecutiveReport(branchStats, expenses, payslips);
    const romaSur = report.branches.find((b) => b.branchId === 1)!;
    expect(romaSur.revenue).toBe(100000);
    expect(romaSur.expenses).toBe(25000); // rent + utilities, not the corporate marketing expense
    expect(romaSur.payrollCost).toBe(12750); // grossPay, not netPay
    expect(romaSur.netProfit).toBe(100000 - 25000 - 12750);
  });

  it('keeps corporate (branchId null) expenses out of every branch P&L', () => {
    const report = calculateExecutiveReport(branchStats, expenses, payslips);
    expect(report.branches.every((b) => b.expenses !== 8000)).toBe(true);
    expect(report.corporateExpenses).toBe(8000);
  });

  it('sorts branches by net profit, most profitable first', () => {
    const report = calculateExecutiveReport(branchStats, expenses, payslips);
    const romaNorte = report.branches.find((b) => b.branchId === 2)!;
    const romaSur = report.branches.find((b) => b.branchId === 1)!;
    // Roma Norte: 50000 - 15000 - 7500 = 27500. Roma Sur: 100000 - 25000 - 12750 = 62250.
    expect(report.branches[0].branchId).toBe(romaSur.netProfit >= romaNorte.netProfit ? 1 : 2);
  });

  it('rolls up company-wide totals, including corporate expenses', () => {
    const report = calculateExecutiveReport(branchStats, expenses, payslips);
    expect(report.totalRevenue).toBe(150000);
    expect(report.totalExpenses).toBe(20000 + 5000 + 15000 + 8000);
    expect(report.totalPayrollCost).toBe(12750 + 7500);
    expect(report.totalNetProfit).toBe(report.totalRevenue - report.totalExpenses - report.totalPayrollCost);
  });

  it('groups expenses by category across every branch and corporate', () => {
    const report = calculateExecutiveReport(branchStats, expenses, payslips);
    const rent = report.expensesByCategory.find((c) => c.category === 'rent');
    expect(rent?.total).toBe(35000); // both branches' rent combined
    const marketing = report.expensesByCategory.find((c) => c.category === 'marketing');
    expect(marketing?.total).toBe(8000);
  });

  it('handles a branch with no expenses or payslips yet', () => {
    const report = calculateExecutiveReport(
      [{ branchId: 9, branchName: 'Nueva Sucursal', revenue: 0, activeCustomers: 0, checkInsToday: 0, checkIns: 0 }],
      [],
      []
    );
    expect(report.branches[0]).toEqual({ branchId: 9, branchName: 'Nueva Sucursal', revenue: 0, expenses: 0, payrollCost: 0, netProfit: 0 });
  });
});
