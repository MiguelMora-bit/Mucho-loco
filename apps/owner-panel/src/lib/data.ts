import type { AttendanceSummary, BranchInventoryLevel, BranchStatsSummary, Employee, Expense, InventoryTransfer, Payslip, PayrollPeriod } from '@mucho-loco/types';

export const BRANCH_STATS: BranchStatsSummary[] = [
  { branchId: 1, branchName: 'Roma Sur', revenue: 186400, activeCustomers: 312 },
  { branchId: 2, branchName: 'Roma Norte', revenue: 142200, activeCustomers: 248 },
  { branchId: 3, branchName: 'Condesa', revenue: 168900, activeCustomers: 287 },
  { branchId: 5, branchName: 'Santa Fe', revenue: 231500, activeCustomers: 401 },
];

// Per-branch stock — statsRepository.getGlobalInventory() sums this at call
// time (never a separately-tracked total), so a transfer between branches
// can never leave the dashboard's total out of sync with reality.
export const BRANCH_INVENTORY: BranchInventoryLevel[] = [
  { branchId: 1, productId: 'p1', productName: 'Whey Protein 5LBS · Strawberry', unitPrice: 1290, qty: 30 },
  { branchId: 1, productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', unitPrice: 790, qty: 50 },
  { branchId: 1, productId: 'p9', productName: 'Mucho Loco Energy 473ml · Mora-Uva', unitPrice: 45, qty: 200 },
  { branchId: 1, productId: 'p18', productName: 'Shaker Loco', unitPrice: 290, qty: 120 },

  { branchId: 2, productId: 'p1', productName: 'Whey Protein 5LBS · Strawberry', unitPrice: 1290, qty: 20 },
  { branchId: 2, productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', unitPrice: 790, qty: 40 },
  { branchId: 2, productId: 'p9', productName: 'Mucho Loco Energy 473ml · Mora-Uva', unitPrice: 45, qty: 150 },
  { branchId: 2, productId: 'p18', productName: 'Shaker Loco', unitPrice: 290, qty: 80 },

  // Condesa doesn't stock 'p1' yet — the level opens the first time a
  // transfer brings stock in, instead of every branch listing every SKU.
  { branchId: 3, productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', unitPrice: 790, qty: 26 },
  { branchId: 3, productId: 'p9', productName: 'Mucho Loco Energy 473ml · Mora-Uva', unitPrice: 45, qty: 112 },
  { branchId: 3, productId: 'p18', productName: 'Shaker Loco', unitPrice: 290, qty: 60 },

  { branchId: 5, productId: 'p1', productName: 'Whey Protein 5LBS · Strawberry', unitPrice: 1290, qty: 20 },
  { branchId: 5, productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', unitPrice: 790, qty: 40 },
  { branchId: 5, productId: 'p9', productName: 'Mucho Loco Energy 473ml · Mora-Uva', unitPrice: 45, qty: 150 },
  { branchId: 5, productId: 'p18', productName: 'Shaker Loco', unitPrice: 290, qty: 80 },
];

// Mutated in place by inventoryTransfer.mock.ts on each transfer — same
// pattern as EXPENSES/BRANCH_INVENTORY (branch-app).
export const INVENTORY_TRANSFERS: InventoryTransfer[] = [
  { id: 'transfer-1', productId: 'p18', productName: 'Shaker Loco', fromBranchId: 1, fromBranchName: 'Roma Sur', toBranchId: 3, toBranchName: 'Condesa', qty: 15, createdAt: '2026-08-20T14:00:00.000Z' },
];

export const EMPLOYEES: Employee[] = [
  { id: 'emp-1', branchId: 1, name: 'Fernando Osorio', role: 'manager', dailyRate: 850, hireDate: '2021-03-15', active: true },
  { id: 'emp-2', branchId: 1, name: 'Itzel Navarro', role: 'counter', dailyRate: 500, hireDate: '2023-06-01', active: true },
  { id: 'emp-3', branchId: 2, name: 'Rodrigo Beltrán', role: 'manager', dailyRate: 850, hireDate: '2020-11-10', active: true },
  { id: 'emp-4', branchId: 2, name: 'Paulina Cortés', role: 'counter', dailyRate: 500, hireDate: '2024-02-20', active: true },
  { id: 'emp-5', branchId: 3, name: 'Mauricio Villalobos', role: 'manager', dailyRate: 850, hireDate: '2022-01-05', active: true },
  { id: 'emp-6', branchId: 3, name: 'Ximena Rosales', role: 'counter', dailyRate: 500, hireDate: '2023-09-18', active: true },
  { id: 'emp-7', branchId: 5, name: 'Alejandro Zúñiga', role: 'manager', dailyRate: 850, hireDate: '2019-07-22', active: true },
  { id: 'emp-8', branchId: 5, name: 'Renata Ibarra', role: 'counter', dailyRate: 500, hireDate: '2024-08-12', active: true },
  // `active` isn't read by today's payroll calculation (attendance rows are
  // the only thing runPayroll looks at) — it's reserved for a future
  // manage-employees screen.
  { id: 'emp-9', branchId: 5, name: 'Gael Contreras', role: 'coach', dailyRate: 700, hireDate: '2022-05-30', active: true },
];

// Two quincenas: period-1 is already processed (closed), period-2 has
// attendance recorded but no payslips yet — that's what runPayroll produces.
export const PAYROLL_PERIODS: PayrollPeriod[] = [
  { id: 'period-1', startDate: '2026-08-01', endDate: '2026-08-15', totalDays: 15, status: 'closed' },
  { id: 'period-2', startDate: '2026-08-16', endDate: '2026-08-31', totalDays: 16, status: 'open' },
];

export const ATTENDANCE_SUMMARIES: AttendanceSummary[] = [
  // period-1 (totalDays 15) — emp-8's 12 days (500 * 12 = 6000) lands exactly
  // on an ISR bracket boundary, useful as a shared fixture for payroll.test.ts.
  { employeeId: 'emp-1', periodId: 'period-1', daysWorked: 15 },
  { employeeId: 'emp-2', periodId: 'period-1', daysWorked: 14 },
  { employeeId: 'emp-3', periodId: 'period-1', daysWorked: 15 },
  { employeeId: 'emp-4', periodId: 'period-1', daysWorked: 13 },
  { employeeId: 'emp-5', periodId: 'period-1', daysWorked: 14 },
  { employeeId: 'emp-6', periodId: 'period-1', daysWorked: 15 },
  { employeeId: 'emp-7', periodId: 'period-1', daysWorked: 15 },
  { employeeId: 'emp-8', periodId: 'period-1', daysWorked: 12 },
  { employeeId: 'emp-9', periodId: 'period-1', daysWorked: 15 },
  // period-2 (totalDays 16) — attendance already recorded, no payslips yet
  { employeeId: 'emp-1', periodId: 'period-2', daysWorked: 16 },
  { employeeId: 'emp-2', periodId: 'period-2', daysWorked: 15 },
  { employeeId: 'emp-3', periodId: 'period-2', daysWorked: 16 },
  { employeeId: 'emp-4', periodId: 'period-2', daysWorked: 14 },
  { employeeId: 'emp-5', periodId: 'period-2', daysWorked: 15 },
  { employeeId: 'emp-6', periodId: 'period-2', daysWorked: 16 },
  { employeeId: 'emp-7', periodId: 'period-2', daysWorked: 16 },
  { employeeId: 'emp-8', periodId: 'period-2', daysWorked: 13 },
  { employeeId: 'emp-9', periodId: 'period-2', daysWorked: 16 },
];

// Pre-generated for period-1 only, figures matching calculatePayroll() in
// lib/payroll.ts exactly (hand-verified) — period-2 is 'open', so its
// payslips are created by payrollRepository.runPayroll(), not seeded here.
// Mutated in place by payroll.mock.ts, same pattern as EXPENSES.
export const PAYSLIPS: Payslip[] = [
  { id: 'payslip-period-1-emp-1', periodId: 'period-1', employeeId: 'emp-1', employeeName: 'Fernando Osorio', branchId: 1, role: 'manager', daysWorked: 15, totalDays: 15, dailyRate: 850, grossPay: 12750, isrDeduction: 1425, imssDeduction: 319, netPay: 11006, generatedAt: '2026-08-16T09:00:00.000Z' },
  { id: 'payslip-period-1-emp-2', periodId: 'period-1', employeeId: 'emp-2', employeeName: 'Itzel Navarro', branchId: 1, role: 'counter', daysWorked: 14, totalDays: 15, dailyRate: 500, grossPay: 7000, isrDeduction: 525, imssDeduction: 175, netPay: 6300, generatedAt: '2026-08-16T09:00:00.000Z' },
  { id: 'payslip-period-1-emp-3', periodId: 'period-1', employeeId: 'emp-3', employeeName: 'Rodrigo Beltrán', branchId: 2, role: 'manager', daysWorked: 15, totalDays: 15, dailyRate: 850, grossPay: 12750, isrDeduction: 1425, imssDeduction: 319, netPay: 11006, generatedAt: '2026-08-16T09:00:00.000Z' },
  { id: 'payslip-period-1-emp-4', periodId: 'period-1', employeeId: 'emp-4', employeeName: 'Paulina Cortés', branchId: 2, role: 'counter', daysWorked: 13, totalDays: 15, dailyRate: 500, grossPay: 6500, isrDeduction: 450, imssDeduction: 163, netPay: 5887, generatedAt: '2026-08-16T09:00:00.000Z' },
  { id: 'payslip-period-1-emp-5', periodId: 'period-1', employeeId: 'emp-5', employeeName: 'Mauricio Villalobos', branchId: 3, role: 'manager', daysWorked: 14, totalDays: 15, dailyRate: 850, grossPay: 11900, isrDeduction: 1260, imssDeduction: 298, netPay: 10342, generatedAt: '2026-08-16T09:00:00.000Z' },
  { id: 'payslip-period-1-emp-6', periodId: 'period-1', employeeId: 'emp-6', employeeName: 'Ximena Rosales', branchId: 3, role: 'counter', daysWorked: 15, totalDays: 15, dailyRate: 500, grossPay: 7500, isrDeduction: 600, imssDeduction: 188, netPay: 6712, generatedAt: '2026-08-16T09:00:00.000Z' },
  { id: 'payslip-period-1-emp-7', periodId: 'period-1', employeeId: 'emp-7', employeeName: 'Alejandro Zúñiga', branchId: 5, role: 'manager', daysWorked: 15, totalDays: 15, dailyRate: 850, grossPay: 12750, isrDeduction: 1425, imssDeduction: 319, netPay: 11006, generatedAt: '2026-08-16T09:00:00.000Z' },
  { id: 'payslip-period-1-emp-8', periodId: 'period-1', employeeId: 'emp-8', employeeName: 'Renata Ibarra', branchId: 5, role: 'counter', daysWorked: 12, totalDays: 15, dailyRate: 500, grossPay: 6000, isrDeduction: 375, imssDeduction: 150, netPay: 5475, generatedAt: '2026-08-16T09:00:00.000Z' },
  { id: 'payslip-period-1-emp-9', periodId: 'period-1', employeeId: 'emp-9', employeeName: 'Gael Contreras', branchId: 5, role: 'coach', daysWorked: 15, totalDays: 15, dailyRate: 700, grossPay: 10500, isrDeduction: 1050, imssDeduction: 263, netPay: 9187, generatedAt: '2026-08-16T09:00:00.000Z' },
];

// Mutated in place by expenses.mock.ts when a new expense is logged — same
// pattern as branch-app's BRANCH_INVENTORY.
export const EXPENSES: Expense[] = [
  { id: 'exp-1', branchId: 1, category: 'rent', description: 'Renta local Roma Sur', amount: 45000, date: '2026-08-01' },
  { id: 'exp-2', branchId: 1, category: 'utilities', description: 'CFE + agua Roma Sur', amount: 8200, date: '2026-08-03' },
  { id: 'exp-3', branchId: 2, category: 'rent', description: 'Renta local Roma Norte', amount: 38000, date: '2026-08-01' },
  { id: 'exp-4', branchId: 3, category: 'maintenance', description: 'Mantenimiento de equipo de cardio', amount: 12500, date: '2026-08-05' },
  { id: 'exp-5', branchId: 5, category: 'supplies', description: 'Papelería y artículos de limpieza', amount: 3100, date: '2026-08-06' },
  { id: 'exp-6', branchId: null, category: 'marketing', description: 'Campaña de redes sociales nacional', amount: 22000, date: '2026-08-02' },
  { id: 'exp-7', branchId: null, category: 'other', description: 'Nómina de oficina corporativa', amount: 65000, date: '2026-08-01' },
];
