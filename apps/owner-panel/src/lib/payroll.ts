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

/**
 * Pay periods (spec 050): the 1st–15th and the 16th–end of month. Days as
 * `YYYY-MM-DD`. Twin of `apps/backend/src/payroll/payroll-periods.ts` — the
 * mock needs it to open the next period the way the backend does.
 */
export interface PeriodRange {
  startDate: string;
  endDate: string;
  totalDays: number;
}

const ONE_DAY_MS = 86_400_000;
const toDay = (d: Date): string => d.toISOString().slice(0, 10);
const fromDay = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

function rangeOf(start: Date, end: Date): PeriodRange {
  return {
    startDate: toDay(start),
    endDate: toDay(end),
    totalDays: Math.round((end.getTime() - start.getTime()) / ONE_DAY_MS) + 1,
  };
}

/** The pay period a day belongs to. */
export function periodContaining(day: string): PeriodRange {
  const date = fromDay(day);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const firstHalf = date.getUTCDate() <= 15;
  const start = new Date(Date.UTC(year, month, firstHalf ? 1 : 16));
  // Day 0 of next month = the last day of this one.
  const end = new Date(Date.UTC(year, firstHalf ? month : month + 1, firstHalf ? 15 : 0));
  return rangeOf(start, end);
}

/** The period after one ending on `lastEndDate` — it snaps back to the calendar after an irregular one. */
export function nextPeriodRange(lastEndDate: string): PeriodRange {
  const start = new Date(fromDay(lastEndDate).getTime() + ONE_DAY_MS);
  return rangeOf(start, fromDay(periodContaining(toDay(start)).endDate));
}
