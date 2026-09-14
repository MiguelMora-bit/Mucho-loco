import type { AttendanceEntry } from '@mucho-loco/types';
import type { IAttendanceRepository } from '../../repositories/attendance.repository';
import {
  AlreadyClockedInError,
  NoOpenEntryError,
} from '../../repositories/attendance.errors';
import { ApiRequestError, api } from './client';

function toDomainError(e: unknown): unknown {
  if (!(e instanceof ApiRequestError)) return e;
  const staffEmail = String(e.body.staffEmail ?? '');
  switch (e.code) {
    case 'ALREADY_CLOCKED_IN':
      return new AlreadyClockedInError(staffEmail);
    case 'NO_OPEN_ENTRY':
      return new NoOpenEntryError(staffEmail);
    default:
      return e;
  }
}

/**
 * Asistencia de sucursal.
 *
 * `staffEmail` viaja explícito y NO se saca del token a propósito: en
 * mostrador ficha una tablet compartida, abierta con la sesión de quien llegó
 * primero — el que ficha no es necesariamente el dueño del token. Es lo
 * contrario de `/users/me` en customer-app.
 */
export class AttendanceHttpDatasource implements IAttendanceRepository {
  /**
   * El backend responde 200 con cuerpo VACÍO cuando el empleado no tiene turno
   * abierto (devuelve `null`), y el cliente lo traduce a `undefined` — el
   * contrato pide `null`.
   */
  async getOpenEntry(staffEmail: string): Promise<AttendanceEntry | null> {
    const entry = await api.get<AttendanceEntry | null>('/attendance/open', {
      query: { staffEmail },
    });
    return entry ?? null;
  }

  async clockIn(branchId: number, staffEmail: string, staffName: string): Promise<AttendanceEntry> {
    try {
      return await api.post<AttendanceEntry>(`/branches/${branchId}/attendance/clock-in`, {
        staffEmail,
        staffName,
      });
    } catch (e) {
      throw toDomainError(e);
    }
  }

  async clockOut(staffEmail: string): Promise<AttendanceEntry> {
    try {
      return await api.post<AttendanceEntry>('/attendance/clock-out', { staffEmail });
    } catch (e) {
      throw toDomainError(e);
    }
  }

  getTeamToday(branchId: number): Promise<AttendanceEntry[]> {
    return api.get<AttendanceEntry[]>(`/branches/${branchId}/attendance/today`);
  }
}
