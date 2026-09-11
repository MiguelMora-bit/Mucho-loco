import type { BranchPnl, BranchStatsSummary, ExecutiveReport, Expense, ExpenseCategory, Payslip } from '@mucho-loco/types';

/** Payroll cost per branch uses grossPay, not netPay — netPay is what the
 *  employee takes home, but the deductions (ISR/IMSS) are still money the
 *  business paid out on their behalf, so grossPay is the real cost line. */
function payrollCostByBranch(payslips: Payslip[], branchId: number): number {
  return payslips.filter((p) => p.branchId === branchId).reduce((sum, p) => sum + p.grossPay, 0);
}

function expensesByBranch(expenses: Expense[], branchId: number): number {
  return expenses.filter((e) => e.branchId === branchId).reduce((sum, e) => sum + e.amount, 0);
}

/** Pure so the P&L math has its own test, independent of how branch stats,
 *  expenses, and payslips were fetched — same reasoning as payroll.ts. */
export function calculateExecutiveReport(branchStats: BranchStatsSummary[], expenses: Expense[], payslips: Payslip[]): ExecutiveReport {
  const branches: BranchPnl[] = branchStats
    .map((b) => {
      const branchExpenses = expensesByBranch(expenses, b.branchId);
      const payrollCost = payrollCostByBranch(payslips, b.branchId);
      return {
        branchId: b.branchId,
        branchName: b.branchName,
        revenue: b.revenue,
        expenses: branchExpenses,
        payrollCost,
        netProfit: b.revenue - branchExpenses - payrollCost,
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);

  const corporateExpenses = expenses.filter((e) => e.branchId === null).reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals = new Map<ExpenseCategory, number>();
  for (const e of expenses) categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount);
  const expensesByCategory = [...categoryTotals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const totalRevenue = branches.reduce((sum, b) => sum + b.revenue, 0);
  const totalBranchExpenses = branches.reduce((sum, b) => sum + b.expenses, 0);
  const totalPayrollCost = branches.reduce((sum, b) => sum + b.payrollCost, 0);
  const totalExpenses = totalBranchExpenses + corporateExpenses;

  return {
    branches,
    totalRevenue,
    totalExpenses,
    totalPayrollCost,
    totalNetProfit: totalRevenue - totalExpenses - totalPayrollCost,
    corporateExpenses,
    expensesByCategory,
  };
}
