import type { BranchStatsSummary, GlobalInventoryItem } from '@mucho-loco/types';

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
