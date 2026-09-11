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
