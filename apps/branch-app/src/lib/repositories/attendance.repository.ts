import type { AttendanceEntry } from '@mucho-loco/types';
import { AttendanceMockDatasource } from '../datasources/mock/attendance.mock';

export { AlreadyClockedInError, NoOpenEntryError } from './attendance.errors';

export interface IAttendanceRepository {
  /** La entrada 'abierta' (clockOut: null) de ese empleado, si tiene una. */
  getOpenEntry(staffEmail: string): Promise<AttendanceEntry | null>;
  clockIn(branchId: number, staffEmail: string, staffName: string): Promise<AttendanceEntry>;
  clockOut(staffEmail: string): Promise<AttendanceEntry>;
  /** Entradas de HOY de toda la sucursal, más reciente primero — vista de gerente. */
  getTeamToday(branchId: number): Promise<AttendanceEntry[]>;
}

// Swap this line to plug in a real API datasource
export const attendanceRepository: IAttendanceRepository = new AttendanceMockDatasource();
