import type { AccessCheckResult, CheckInResult } from './AccessMethod';
import { MOCK_BRANCH_NAMES } from '../data';

/**
 * Bitácora de entradas del mock — gemela de `CounterMembershipsService.checkIn`
 * del backend (spec 012): una entrada por socio por día de CDMX, y un segundo
 * escaneo el mismo día devuelve la hora de la primera. Vive en memoria: se
 * pierde al recargar, como el resto del mock.
 */
const firstEntryToday = new Map<string, { day: string; visitedAt: string; branchId: number }>();

const branchName = (id: number) => MOCK_BRANCH_NAMES[id] ?? `Sucursal ${id}`;

const MEXICO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' });

export function withMockCheckIn(result: AccessCheckResult, branchId: number, now: Date = new Date()): CheckInResult {
  if (result.outcome !== 'valid') return result;
  const day = MEXICO_DAY.format(now);
  const previous = firstEntryToday.get(result.record.qrCode);
  if (previous?.day === day) {
    // Spec 020: la sucursal de la primera entrada — si no es esta, mostrador ve el aviso rojo.
    const first = { firstBranchId: previous.branchId, firstBranch: branchName(previous.branchId) };
    return { ...result, checkIn: { visitedAt: previous.visitedAt, firstToday: false, ...first } };
  }
  const visitedAt = now.toISOString();
  firstEntryToday.set(result.record.qrCode, { day, visitedAt, branchId });
  return { ...result, checkIn: { visitedAt, firstToday: true, firstBranchId: branchId, firstBranch: branchName(branchId) } };
}

/** Solo para tests: cada test arranca sin entradas. */
export function resetMockCheckIns(): void {
  firstEntryToday.clear();
}
