import type { AccessCheckResult, CheckInResult } from './AccessMethod';

/**
 * Bitácora de entradas del mock — gemela de `CounterMembershipsService.checkIn`
 * del backend (spec 012): una entrada por socio por día de CDMX, y un segundo
 * escaneo el mismo día devuelve la hora de la primera. Vive en memoria: se
 * pierde al recargar, como el resto del mock.
 */
const firstEntryToday = new Map<string, { day: string; visitedAt: string }>();

const MEXICO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' });

export function withMockCheckIn(result: AccessCheckResult, now: Date = new Date()): CheckInResult {
  if (result.outcome !== 'valid') return result;
  const day = MEXICO_DAY.format(now);
  const previous = firstEntryToday.get(result.record.qrCode);
  if (previous?.day === day) {
    return { ...result, checkIn: { visitedAt: previous.visitedAt, firstToday: false } };
  }
  const visitedAt = now.toISOString();
  firstEntryToday.set(result.record.qrCode, { day, visitedAt });
  return { ...result, checkIn: { visitedAt, firstToday: true } };
}

/** Solo para tests: cada test arranca sin entradas. */
export function resetMockCheckIns(): void {
  firstEntryToday.clear();
}
