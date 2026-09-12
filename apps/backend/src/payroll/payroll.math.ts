/**
 * SOLO ILUSTRATIVO — la tabla de ISR y la tasa de IMSS de abajo son números
 * redondos inventados para demostrar una retención progresiva
 * (asistencia → bruto → deducciones → neto → recibo). NO son la tabla real de
 * retención del SAT ni las cuotas obrero-patronales reales del IMSS. No usar
 * estas cifras para nómina real.
 *
 * Gemelo de `owner-panel/src/lib/payroll.ts`, que hoy hace esta misma cuenta
 * en el navegador. La diferencia importa: a partir de aquí el recibo lo emite
 * el servidor y queda GUARDADO — un recibo es un documento histórico, no algo
 * que se recalcule cada vez que alguien abre la pantalla. Cuando owner-panel
 * conecte a este backend, su copia se borra.
 */

export interface PayrollCalculation {
  grossPay: number;
  isrDeduction: number;
  imssDeduction: number;
  netPay: number;
}

const ISR_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 1500, rate: 0 },
  { upTo: 3000, rate: 0.05 },
  { upTo: 6000, rate: 0.1 },
  { upTo: 12000, rate: 0.15 },
  { upTo: Infinity, rate: 0.2 },
];

const IMSS_RATE = 0.025;

/** Retención progresiva/marginal — ver la advertencia de arriba. */
export function calculateISR(grossPay: number): number {
  let tax = 0;
  let lowerBound = 0;
  for (const bracket of ISR_BRACKETS) {
    if (grossPay <= lowerBound) break;
    tax += (Math.min(grossPay, bracket.upTo) - lowerBound) * bracket.rate;
    lowerBound = bracket.upTo;
  }
  return Math.round(tax);
}

/** Aproximación a tasa plana — ver la advertencia de arriba. */
export function calculateIMSS(grossPay: number): number {
  return Math.round(grossPay * IMSS_RATE);
}

export function calculatePayroll(dailyRate: number, daysWorked: number): PayrollCalculation {
  const grossPay = dailyRate * daysWorked;
  const isrDeduction = calculateISR(grossPay);
  const imssDeduction = calculateIMSS(grossPay);
  return { grossPay, isrDeduction, imssDeduction, netPay: grossPay - isrDeduction - imssDeduction };
}
