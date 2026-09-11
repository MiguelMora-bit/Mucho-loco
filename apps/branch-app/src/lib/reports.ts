import type { BranchInventoryLevel, BranchSalesReport, CounterSale, DailySales, MembershipPayment, TopProduct } from '@mucho-loco/types';

/** Por debajo de esto, `ProductSaleTab`/`ReportsPage` marcan el producto como bajo stock. */
export const LOW_STOCK_THRESHOLD = 15;

export function isLowStock(level: BranchInventoryLevel): boolean {
  return level.qty < LOW_STOCK_THRESHOLD;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Pure so the aggregation math has its own test, independent of how the
 *  sales/payments were fetched — same reasoning as cashRegister.ts. */
export function calculateSalesReport(
  branchId: number,
  days: number,
  sales: CounterSale[],
  payments: MembershipPayment[]
): BranchSalesReport {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const branchSales = sales.filter((s) => s.branchId === branchId && s.createdAt >= sinceIso);
  const branchPayments = payments.filter((p) => p.branchId === branchId && p.createdAt >= sinceIso);

  const byDayMap = new Map<string, number>();
  for (const s of branchSales) byDayMap.set(toDateKey(s.createdAt), (byDayMap.get(toDateKey(s.createdAt)) ?? 0) + s.total);
  for (const p of branchPayments) byDayMap.set(toDateKey(p.createdAt), (byDayMap.get(toDateKey(p.createdAt)) ?? 0) + p.amount);
  const byDay: DailySales[] = [...byDayMap.entries()]
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const productMap = new Map<string, TopProduct>();
  for (const sale of branchSales) {
    for (const item of sale.items) {
      const existing = productMap.get(item.productId);
      const revenue = item.qty * item.unitPrice;
      if (existing) {
        existing.qtySold += item.qty;
        existing.revenue += revenue;
      } else {
        productMap.set(item.productId, { productId: item.productId, productName: item.productName, qtySold: item.qty, revenue });
      }
    }
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.qtySold - a.qtySold).slice(0, 5);

  return {
    branchId,
    days,
    totalRevenue: branchSales.reduce((sum, s) => sum + s.total, 0) + branchPayments.reduce((sum, p) => sum + p.amount, 0),
    transactionCount: branchSales.length + branchPayments.length,
    byDay,
    topProducts,
  };
}
