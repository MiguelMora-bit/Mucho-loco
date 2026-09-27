import type { PaymentMethod, ShiftTransaction } from '@mucho-loco/types';

/**
 * Lo que se congela al cerrar un turno (spec 052). Gemela de
 * `calculateShiftTotals` en `branch-app/src/lib/cashRegister.ts`, que pinta el
 * corte mientras el turno sigue abierto.
 */
export function shiftTotals(transactions: readonly ShiftTransaction[]): {
  totals: Record<PaymentMethod, number>;
  transactionCount: number;
} {
  const totals: Record<PaymentMethod, number> = { cash: 0, card: 0, transfer: 0 };
  for (const t of transactions) totals[t.paymentMethod] += t.amount;
  return { totals, transactionCount: transactions.length };
}

/** Contado − esperado: negativo es faltante, positivo sobrante. Sin arqueo, `null`. */
export function cashDifference(counted: number | null, expected: number | null): number | null {
  if (counted === null || expected === null) return null;
  return counted - expected;
}
