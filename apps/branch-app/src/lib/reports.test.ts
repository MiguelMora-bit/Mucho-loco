import { describe, it, expect } from 'vitest';
import { calculateSalesReport, isLowStock, LOW_STOCK_THRESHOLD } from './reports';
import type { CounterSale, MembershipPayment } from '@mucho-loco/types';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('isLowStock', () => {
  it('flags quantities below the threshold', () => {
    expect(isLowStock({ branchId: 1, productId: 'p1', productName: 'X', unitPrice: 100, qty: LOW_STOCK_THRESHOLD - 1, img: '' })).toBe(true);
  });

  it('does not flag quantities at or above the threshold', () => {
    expect(isLowStock({ branchId: 1, productId: 'p1', productName: 'X', unitPrice: 100, qty: LOW_STOCK_THRESHOLD, img: '' })).toBe(false);
  });
});

describe('calculateSalesReport', () => {
  const sales: CounterSale[] = [
    { id: '#CS-1', branchId: 1, items: [{ productId: 'p1', productName: 'Whey', qty: 2, unitPrice: 100 }], total: 200, paymentMethod: 'cash', createdAt: daysAgoIso(1) },
    { id: '#CS-2', branchId: 1, items: [{ productId: 'p1', productName: 'Whey', qty: 1, unitPrice: 100 }], total: 100, paymentMethod: 'card', createdAt: daysAgoIso(3) },
    { id: '#CS-3', branchId: 1, items: [{ productId: 'p2', productName: 'Shaker', qty: 1, unitPrice: 290 }], total: 290, paymentMethod: 'cash', createdAt: daysAgoIso(20) },
    { id: '#CS-4', branchId: 2, items: [{ productId: 'p1', productName: 'Whey', qty: 5, unitPrice: 100 }], total: 500, paymentMethod: 'cash', createdAt: daysAgoIso(1) },
  ];
  const payments: MembershipPayment[] = [
    { id: '#MP-1', branchId: 1, qrCode: 'ML-QR-1', memberName: 'Diego', phone: '', tierKey: 'all', periodKey: 'monthly', amount: 1090, paymentMethod: 'cash', isNewMember: false, createdAt: daysAgoIso(2) },
  ];

  it('only counts the requested branch within the day window', () => {
    const report = calculateSalesReport(1, 7, sales, payments);
    expect(report.transactionCount).toBe(3); // CS-1, CS-2, MP-1 — not CS-3 (too old) nor CS-4 (other branch)
    expect(report.totalRevenue).toBe(200 + 100 + 1090);
  });

  it('excludes transactions older than the window', () => {
    const report = calculateSalesReport(1, 7, sales, payments);
    expect(report.byDay.every((d) => sales.every((s) => s.createdAt !== daysAgoIso(20) || d.date !== daysAgoIso(20).slice(0, 10)))).toBe(true);
  });

  it('aggregates top products by quantity sold', () => {
    const report = calculateSalesReport(1, 7, sales, payments);
    expect(report.topProducts[0]).toMatchObject({ productId: 'p1', qtySold: 3, revenue: 300 });
  });

  it('returns zeros for a branch/window with no activity', () => {
    const report = calculateSalesReport(99, 7, sales, payments);
    expect(report.totalRevenue).toBe(0);
    expect(report.transactionCount).toBe(0);
    expect(report.byDay).toEqual([]);
    expect(report.topProducts).toEqual([]);
  });
});
