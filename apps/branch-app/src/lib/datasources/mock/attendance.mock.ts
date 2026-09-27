import type { AttendanceEntry } from '@mucho-loco/types';
import { ATTENDANCE_ENTRIES } from '../../data';
import { delay } from './delay';
import {
  AlreadyClockedInError,
  EntryAlreadyClosedError,
  EntryNotFoundError,
  InvalidClockOutError,
  NoOpenEntryError,
} from '../../repositories/attendance.errors';
import { clockOutProblem } from '../../clockOutRule';
import { useAuthStore } from '../../stores/auth.store';
import type { IAttendanceRepository } from '../../repositories/attendance.repository';

function findOpenEntry(staffEmail: string): AttendanceEntry | undefined {
  return ATTENDANCE_ENTRIES.find((e) => e.staffEmail === staffEmail && e.clockOut === null);
}

export class AttendanceMockDatasource implements IAttendanceRepository {
  async getOpenEntry(staffEmail: string): Promise<AttendanceEntry | null> {
    await delay(120);
    return findOpenEntry(staffEmail) ?? null;
  }

  async clockIn(branchId: number, staffEmail: string, staffName: string): Promise<AttendanceEntry> {
    await delay(150);
    if (findOpenEntry(staffEmail)) throw new AlreadyClockedInError(staffEmail);

    const entry: AttendanceEntry = {
      id: `#ATT-${Date.now()}`,
      branchId,
      staffEmail,
      staffName,
      clockIn: new Date().toISOString(),
      clockOut: null,
      correctedBy: null,
    };
    ATTENDANCE_ENTRIES.push(entry);
    return entry;
  }

  async clockOut(staffEmail: string): Promise<AttendanceEntry> {
    await delay(150);
    const entry = findOpenEntry(staffEmail);
    if (!entry) throw new NoOpenEntryError(staffEmail);
    entry.clockOut = new Date().toISOString();
    return entry;
  }

  async getTeamToday(branchId: number): Promise<AttendanceEntry[]> {
    await delay(150);
    // "Hoy" en hora local, como el backend (TZ=America/Mexico_City) — con el
    // día UTC, a partir de las 18:00 la lista salía vacía.
    const today = new Date().toDateString();
    return ATTENDANCE_ENTRIES
      .filter((e) => e.branchId === branchId && new Date(e.clockIn).toDateString() === today)
      .sort((a, b) => b.clockIn.localeCompare(a.clockIn));
  }

  async getForgottenEntries(branchId: number): Promise<AttendanceEntry[]> {
    await delay(150);
    // Abiertos desde antes de hoy (hora local), como el backend.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return ATTENDANCE_ENTRIES
      .filter((e) => e.branchId === branchId && e.clockOut === null && new Date(e.clockIn) < startOfToday)
      .sort((a, b) => a.clockIn.localeCompare(b.clockIn));
  }

  async closeEntry(entryId: string, clockOut: string): Promise<AttendanceEntry> {
    await delay(200);
    const entry = ATTENDANCE_ENTRIES.find((e) => e.id === entryId);
    if (!entry) throw new EntryNotFoundError(entryId);
    if (entry.clockOut) throw new EntryAlreadyClosedError(entryId);
    const problem = clockOutProblem(new Date(entry.clockIn), new Date(clockOut));
    if (problem) throw new InvalidClockOutError(entryId, problem);
    // Quién corrigió sale de la sesión, como en el backend sale del token.
    entry.clockOut = new Date(clockOut).toISOString();
    entry.correctedBy = useAuthStore.getState().user?.name ?? null;
    return entry;
  }
}
