import { describe, it, expect } from 'vitest';
import { calculateShiftTotals, cashDifference } from './cashRegister';
import type { ShiftTransaction } from '@mucho-loco/types';

function tx(overrides: Partial<ShiftTransaction>): ShiftTransaction {
  return { id: 't1', kind: 'sale', description: 'x', amount: 0, paymentMethod: 'cash', createdAt: '2026-09-11T10:00:00.000Z', ...overrides };
}

describe('calculateShiftTotals', () => {
  it('returns zeroes and no transactions for an empty shift', () => {
    expect(calculateShiftTotals([])).toEqual({ totals: { cash: 0, card: 0, transfer: 0 }, transactionCount: 0 });
  });

  it('sums amounts by payment method', () => {
    const result = calculateShiftTotals([
      tx({ paymentMethod: 'cash', amount: 100 }),
      tx({ paymentMethod: 'cash', amount: 50 }),
      tx({ paymentMethod: 'card', amount: 200 }),
      tx({ paymentMethod: 'transfer', amount: 30 }),
    ]);
    expect(result).toEqual({ totals: { cash: 150, card: 200, transfer: 30 }, transactionCount: 4 });
  });

  it('mixes sale and membership transactions in the same totals', () => {
    const result = calculateShiftTotals([
      tx({ kind: 'sale', paymentMethod: 'cash', amount: 290 }),
      tx({ kind: 'membership', paymentMethod: 'cash', amount: 1090 }),
    ]);
    expect(result.totals.cash).toBe(1380);
    expect(result.transactionCount).toBe(2);
  });
});

describe('cashDifference (spec 052)', () => {
  it('reads a shortage as negative and an overage as positive', () => {
    expect(cashDifference(1000, 1090)).toBe(-90);
    expect(cashDifference(1100, 1090)).toBe(10);
    expect(cashDifference(0, 0)).toBe(0);
  });

  it('has no difference without a count', () => {
    expect(cashDifference(null, 1090)).toBeNull();
  });
});
