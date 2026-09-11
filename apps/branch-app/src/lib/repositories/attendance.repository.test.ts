import { describe, it, expect } from 'vitest';
import { attendanceRepository, AlreadyClockedInError, NoOpenEntryError } from './attendance.repository';

describe('attendanceRepository', () => {
  it('clockIn opens an entry that getOpenEntry then returns', async () => {
    const email = `test-${Date.now()}@mucholoco.mx`;
    expect(await attendanceRepository.getOpenEntry(email)).toBeNull();

    const entry = await attendanceRepository.clockIn(1, email, 'Test Staff');
    expect(entry.clockOut).toBeNull();
    expect(entry.staffEmail).toBe(email);

    const open = await attendanceRepository.getOpenEntry(email);
    expect(open?.id).toBe(entry.id);
  });

  it('clockIn rejects a second clock-in while one is already open', async () => {
    const email = `test-${Date.now()}@mucholoco.mx`;
    await attendanceRepository.clockIn(1, email, 'Test Staff');
    await expect(attendanceRepository.clockIn(1, email, 'Test Staff')).rejects.toThrow(AlreadyClockedInError);
  });

  it('clockOut closes the open entry, and getOpenEntry then returns null', async () => {
    const email = `test-${Date.now()}@mucholoco.mx`;
    const entry = await attendanceRepository.clockIn(1, email, 'Test Staff');
    const closed = await attendanceRepository.clockOut(email);
    expect(closed.id).toBe(entry.id);
    expect(closed.clockOut).not.toBeNull();

    expect(await attendanceRepository.getOpenEntry(email)).toBeNull();
  });

  it('clockOut rejects when there is no open entry', async () => {
    const email = `test-${Date.now()}@mucholoco.mx`;
    await expect(attendanceRepository.clockOut(email)).rejects.toThrow(NoOpenEntryError);
  });

  it('a staff member can clock in again after clocking out', async () => {
    const email = `test-${Date.now()}@mucholoco.mx`;
    await attendanceRepository.clockIn(1, email, 'Test Staff');
    await attendanceRepository.clockOut(email);
    const second = await attendanceRepository.clockIn(1, email, 'Test Staff');
    expect(second.clockOut).toBeNull();
  });

  it('getTeamToday only returns entries for that branch, dated today', async () => {
    const email = `test-${Date.now()}@mucholoco.mx`;
    await attendanceRepository.clockIn(1, email, 'Test Staff');
    const team = await attendanceRepository.getTeamToday(1);
    expect(team.some((e) => e.staffEmail === email)).toBe(true);
    expect(team.every((e) => e.branchId === 1)).toBe(true);

    const otherBranch = await attendanceRepository.getTeamToday(999);
    expect(otherBranch.some((e) => e.staffEmail === email)).toBe(false);
  });
});
