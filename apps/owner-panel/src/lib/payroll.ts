/**
 * SIMPLIFIED / ILLUSTRATIVE ONLY — the ISR bracket table and IMSS rate below
 * are round, made-up numbers chosen to demonstrate a progressive-withholding
 * calculation pipeline (attendance -> gross -> deductions -> net pay ->
 * recibo). They are NOT the real SAT ISR withholding table and NOT the real
 * IMSS worker contribution rates. Do not use these figures for real payroll.
 */

export interface PayrollCalculation {
  grossPay: number;
  isrDeduction: number;
  imssDeduction: number;
  netPay: number;
}

interface IsrBracket {
  upTo: number;
  rate: number;
}

const ISR_BRACKETS: IsrBracket[] = [
  { upTo: 1500, rate: 0 },
  { upTo: 3000, rate: 0.05 },
  { upTo: 6000, rate: 0.1 },
  { upTo: 12000, rate: 0.15 },
  { upTo: Infinity, rate: 0.2 },
];

const IMSS_RATE = 0.025;

/** Marginal/progressive ISR withholding — see the illustrative-only warning
 *  at the top of this file. */
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

/** Flat-rate IMSS approximation — see the illustrative-only warning at the
 *  top of this file. */
export function calculateIMSS(grossPay: number): number {
  return Math.round(grossPay * IMSS_RATE);
}

export function calculatePayroll(dailyRate: number, daysWorked: number): PayrollCalculation {
  const grossPay = dailyRate * daysWorked;
  const isrDeduction = calculateISR(grossPay);
  const imssDeduction = calculateIMSS(grossPay);
  return { grossPay, isrDeduction, imssDeduction, netPay: grossPay - isrDeduction - imssDeduction };
}
