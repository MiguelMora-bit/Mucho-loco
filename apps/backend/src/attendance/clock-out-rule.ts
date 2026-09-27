/** Un turno más largo que esto es otro error de captura, no una jornada. */
export const MAX_SHIFT_HOURS = 24;

export type ClockOutProblem = 'before_clock_in' | 'in_future' | 'too_long';

/**
 * La hora de salida que captura el gerente para un turno que quedó abierto
 * (spec 055): después de la entrada, no en el futuro, y dentro de un turno.
 * `null` = válida.
 */
export function clockOutProblem(clockIn: Date, clockOut: Date, now: Date = new Date()): ClockOutProblem | null {
  if (clockOut.getTime() <= clockIn.getTime()) return 'before_clock_in';
  if (clockOut.getTime() > now.getTime()) return 'in_future';
  if (clockOut.getTime() - clockIn.getTime() > MAX_SHIFT_HOURS * 3_600_000) return 'too_long';
  return null;
}
