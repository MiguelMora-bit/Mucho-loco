import type { CashShiftAudit } from '@mucho-loco/types';

export interface CashAuditSummary {
  shifts: number;
  /** Suma de los faltantes, en positivo. */
  shortage: number;
  overage: number;
  /** Cortes que no cuadraron (faltante o sobrante). */
  withDifference: number;
  /** Cortes cerrados antes de que existiera el arqueo. */
  uncounted: number;
}

/** El resumen de la pantalla "Cortes de caja" (spec 052). Pura, con su test. */
export function summarizeCashAudit(shifts: readonly CashShiftAudit[]): CashAuditSummary {
  const summary: CashAuditSummary = { shifts: shifts.length, shortage: 0, overage: 0, withDifference: 0, uncounted: 0 };
  for (const { difference } of shifts) {
    if (difference === null) summary.uncounted += 1;
    else if (difference < 0) summary.shortage -= difference;
    else if (difference > 0) summary.overage += difference;
    if (difference !== null && difference !== 0) summary.withDifference += 1;
  }
  return summary;
}
