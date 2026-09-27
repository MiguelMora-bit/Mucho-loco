import type { AttendanceEntry } from '@mucho-loco/types';
import { AttendanceMockDatasource } from '../datasources/mock/attendance.mock';
import { AttendanceHttpDatasource } from '../datasources/http/attendance.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export {
  AlreadyClockedInError,
  NoOpenEntryError,
  EntryNotFoundError,
  EntryAlreadyClosedError,
  InvalidClockOutError,
} from './attendance.errors';

export interface IAttendanceRepository {
  /** La entrada 'abierta' (clockOut: null) de ese empleado, si tiene una. */
  getOpenEntry(staffEmail: string): Promise<AttendanceEntry | null>;
  clockIn(branchId: number, staffEmail: string, staffName: string): Promise<AttendanceEntry>;
  clockOut(staffEmail: string): Promise<AttendanceEntry>;
  /** Entradas de HOY de toda la sucursal, más reciente primero — vista de gerente. */
  getTeamToday(branchId: number): Promise<AttendanceEntry[]>;
  /** Turnos sin salida de la sucursal abiertos desde antes de hoy, el más viejo primero (spec 055). */
  getForgottenEntries(branchId: number): Promise<AttendanceEntry[]>;
  /** El gerente captura la hora real de salida de un turno olvidado (spec 055). */
  closeEntry(entryId: string, clockOut: string): Promise<AttendanceEntry>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const attendanceRepository: IAttendanceRepository = isHttpDatasourceEnabled()
  ? new AttendanceHttpDatasource()
  : new AttendanceMockDatasource();
