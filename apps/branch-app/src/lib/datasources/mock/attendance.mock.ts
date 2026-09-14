import type { AttendanceEntry } from '@mucho-loco/types';
import { ATTENDANCE_ENTRIES } from '../../data';
import { delay } from './delay';
import { AlreadyClockedInError, NoOpenEntryError } from '../../repositories/attendance.errors';
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
    const todayKey = new Date().toISOString().slice(0, 10);
    return ATTENDANCE_ENTRIES
      .filter((e) => e.branchId === branchId && e.clockIn.slice(0, 10) === todayKey)
      .sort((a, b) => b.clockIn.localeCompare(a.clockIn));
  }
}
