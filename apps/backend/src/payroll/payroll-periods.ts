/**
 * Las quincenas de nómina (spec 050): del 1 al 15 y del 16 a fin de mes.
 * Días como `YYYY-MM-DD` (la columna es `DATE`), sin horas ni zona: el "hoy"
 * de CDMX lo resuelve quien llama (`mexicoDay`).
 *
 * Gemela de `nextPeriodRange` en `owner-panel/src/lib/payroll.ts`, que usa el
 * mock.
 */

export interface PeriodRange {
  startDate: string;
  endDate: string;
  totalDays: number;
}

const ONE_DAY_MS = 86_400_000;

const toDay = (d: Date): string => d.toISOString().slice(0, 10);
const fromDay = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

/** La quincena a la que pertenece un día. */
export function periodContaining(day: string): PeriodRange {
  const date = fromDay(day);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const firstHalf = date.getUTCDate() <= 15;
  const start = new Date(Date.UTC(year, month, firstHalf ? 1 : 16));
  // Día 0 del mes siguiente = el último de este (28, 29, 30 o 31).
  const end = new Date(Date.UTC(year, firstHalf ? month : month + 1, firstHalf ? 15 : 0));
  return rangeOf(start, end);
}

/**
 * La que sigue a una quincena que termina en `lastEndDate`: empieza al día
 * siguiente y termina donde termine la quincena de ese día — así una quincena
 * capturada con otras fechas no descompone el calendario.
 */
export function nextPeriodRange(lastEndDate: string): PeriodRange {
  const start = new Date(fromDay(lastEndDate).getTime() + ONE_DAY_MS);
  return rangeOf(start, fromDay(periodContaining(toDay(start)).endDate));
}

function rangeOf(start: Date, end: Date): PeriodRange {
  return {
    startDate: toDay(start),
    endDate: toDay(end),
    totalDays: Math.round((end.getTime() - start.getTime()) / ONE_DAY_MS) + 1,
  };
}
