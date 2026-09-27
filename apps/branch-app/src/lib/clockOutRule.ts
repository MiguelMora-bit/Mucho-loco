import type { ClockOutProblem } from './repositories/attendance.errors';

/** Un turno más largo que esto es otro error de captura, no una jornada. */
export const MAX_SHIFT_HOURS = 24;

/**
 * La hora de salida que captura el gerente para un turno olvidado (spec 055).
 * Gemela de `apps/backend/src/attendance/clock-out-rule.ts`: el mock la usa y
 * la pantalla la aplica antes de mandar. `null` = válida.
 */
export function clockOutProblem(clockIn: Date, clockOut: Date, now: Date = new Date()): ClockOutProblem | null {
  if (clockOut.getTime() <= clockIn.getTime()) return 'before_clock_in';
  if (clockOut.getTime() > now.getTime()) return 'in_future';
  if (clockOut.getTime() - clockIn.getTime() > MAX_SHIFT_HOURS * 3_600_000) return 'too_long';
  return null;
}
