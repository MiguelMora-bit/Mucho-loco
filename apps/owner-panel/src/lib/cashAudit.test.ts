import { describe, it, expect } from 'vitest';
import type { CashShiftAudit } from '@mucho-loco/types';
import { summarizeCashAudit } from './cashAudit';

function shift(difference: number | null): CashShiftAudit {
  return {
    id: `s-${difference}`,
    branchId: 1,
    branchName: 'Roma Sur',
    openedAt: '2026-09-26T13:00:00.000Z',
    closedAt: '2026-09-26T23:00:00.000Z',
    closedBy: difference === null ? null : 'Ana',
    closedByEmail: null,
    totals: difference === null ? null : { cash: 1000, card: 0, transfer: 0 },
    transactionCount: difference === null ? null : 1,
    countedCash: difference === null ? null : 1000 + difference,
    difference,
  };
}

describe('summarizeCashAudit (spec 052)', () => {
  it('adds shortages and overages apart, never netting one against the other', () => {
    expect(summarizeCashAudit([shift(-90), shift(40), shift(-10), shift(0)])).toEqual({
      shifts: 4,
      shortage: 100,
      overage: 40,
      withDifference: 3,
      uncounted: 0,
    });
  });

  it('counts the shifts closed before counting existed on their own', () => {
    expect(summarizeCashAudit([shift(null), shift(0)])).toEqual({
      shifts: 2,
      shortage: 0,
      overage: 0,
      withDifference: 0,
      uncounted: 1,
    });
  });

  it('an empty month is all zeroes', () => {
    expect(summarizeCashAudit([])).toEqual({ shifts: 0, shortage: 0, overage: 0, withDifference: 0, uncounted: 0 });
  });
});
