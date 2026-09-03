import type { BranchStatsSummary, Expense, GlobalInventoryItem } from '@mucho-loco/types';

export const BRANCH_STATS: BranchStatsSummary[] = [
  { branchId: 1, branchName: 'Roma Sur', revenue: 186400, activeCustomers: 312 },
  { branchId: 2, branchName: 'Roma Norte', revenue: 142200, activeCustomers: 248 },
  { branchId: 3, branchName: 'Condesa', revenue: 168900, activeCustomers: 287 },
  { branchId: 5, branchName: 'Santa Fe', revenue: 231500, activeCustomers: 401 },
];

export const GLOBAL_INVENTORY: GlobalInventoryItem[] = [
  { productId: 'p1', productName: 'Whey Protein 5LBS · Strawberry', totalQty: 84 },
  { productId: 'p7', productName: 'Pre-Entreno Bestia · Mango Chamoy', totalQty: 156 },
  { productId: 'p9', productName: 'Mucho Loco Energy 473ml · Mora-Uva', totalQty: 612 },
  { productId: 'p18', productName: 'Shaker Loco', totalQty: 340 },
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
