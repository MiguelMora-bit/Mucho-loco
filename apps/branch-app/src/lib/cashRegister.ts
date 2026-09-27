import type { PaymentMethod, ShiftTransaction } from '@mucho-loco/types';

export interface ShiftTotals {
  totals: Record<PaymentMethod, number>;
  transactionCount: number;
}

/** Pure so the money math has its own test, independent of how the
 *  transactions were fetched — same reasoning as pricing.ts. */
export function calculateShiftTotals(transactions: ShiftTransaction[]): ShiftTotals {
  const totals: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };
  for (const t of transactions) {
    totals[t.paymentMethod] += t.amount;
  }
  return { totals, transactionCount: transactions.length };
}

/** Arqueo (spec 052): contado − esperado. Negativo = faltante, positivo = sobrante.
 *  Gemela de `cashDifference` en `apps/backend/src/cash-register/shift-totals.ts`. */
export function cashDifference(counted: number | null, expected: number | null): number | null {
  if (counted === null || expected === null) return null;
  return counted - expected;
}
