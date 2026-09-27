/**
 * El mes actual `YYYY-MM` en hora de Ciudad de México (UTC-6 fijo), el mismo
 * reloj con el que el backend corta los meses (`mexicoMonthRange`). `now`
 * solo lo pasan los tests.
 */
export function currentMonth(now: Date = new Date()): string {
  const local = new Date(now.getTime() - 6 * 3600_000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** El mes anterior a `YYYY-MM`. */
export function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** ¿El instante ISO cae en el mes `YYYY-MM` de CDMX? */
export function inMonth(iso: string, month: string): boolean {
  return currentMonth(new Date(iso)) === month;
}

/** Hoy `YYYY-MM-DD` en CDMX (spec 054: la fecha por default de un gasto). */
export function currentDay(now: Date = new Date()): string {
  return new Date(now.getTime() - 6 * 3600_000).toISOString().slice(0, 10);
}
