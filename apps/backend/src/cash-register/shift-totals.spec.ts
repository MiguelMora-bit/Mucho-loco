import type { ShiftTransaction } from '@mucho-loco/types';
import { cashDifference, shiftTotals } from './shift-totals';

const tx = (amount: number, paymentMethod: ShiftTransaction['paymentMethod']): ShiftTransaction => ({
  id: `${paymentMethod}-${amount}`,
  kind: 'sale',
  description: 'x',
  amount,
  paymentMethod,
  createdAt: '2026-09-26T15:00:00.000Z',
});

// Spec 052: lo que se congela al cerrar un turno.
describe('shift totals', () => {
  it('adds up each payment method and counts the movements', () => {
    expect(shiftTotals([tx(1090, 'cash'), tx(290, 'card'), tx(45, 'cash'), tx(500, 'transfer')])).toEqual({
      totals: { cash: 1135, card: 290, transfer: 500 },
      transactionCount: 4,
    });
  });

  it('an empty shift expects nothing', () => {
    expect(shiftTotals([])).toEqual({ totals: { cash: 0, card: 0, transfer: 0 }, transactionCount: 0 });
  });

  it('reads a shortage as negative and an overage as positive', () => {
    expect(cashDifference(1000, 1090)).toBe(-90);
    expect(cashDifference(1100, 1090)).toBe(10);
    expect(cashDifference(0, 0)).toBe(0);
  });

  it('has no difference without a count', () => {
    expect(cashDifference(null, 1090)).toBeNull();
    expect(cashDifference(1000, null)).toBeNull();
  });
});
