import { describe, it, expect } from 'vitest';
import {
  attendanceRepository,
  AlreadyClockedInError,
  EntryAlreadyClosedError,
  EntryNotFoundError,
  InvalidClockOutError,
  NoOpenEntryError,
} from './attendance.repository';
import { useAuthStore } from '../stores/auth.store';

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

  // Spec 055: el gerente cierra el turno que alguien olvidó.
  describe('forgotten clock-outs', () => {
    it('getForgottenEntries lists the forgotten shift from yesterday', async () => {
      const open = await attendanceRepository.getForgottenEntries(1);
      expect(open.find((e) => e.id === '#ATT-SEED-2')).toMatchObject({ staffName: 'Itzel Navarro', clockOut: null });
    });

    it('a shift opened today is someone working, not a forgotten one', async () => {
      const entry = await attendanceRepository.clockIn(1, `today-${Date.now()}@mucholoco.mx`, 'Hoy');
      expect((await attendanceRepository.getForgottenEntries(1)).some((e) => e.id === entry.id)).toBe(false);
    });

    it('closeEntry refuses a time before the clock-in, and keeps it open', async () => {
      const [entry] = (await attendanceRepository.getForgottenEntries(1)).filter((e) => e.id === '#ATT-SEED-2');
      const before = new Date(new Date(entry.clockIn).getTime() - 3_600_000).toISOString();
      await expect(attendanceRepository.closeEntry(entry.id, before)).rejects.toThrow(InvalidClockOutError);
      expect((await attendanceRepository.getForgottenEntries(1)).some((e) => e.id === entry.id)).toBe(true);
    });

    it('closeEntry closes it with the real time and the manager name', async () => {
      useAuthStore.setState({
        user: { email: 'ana@mucholoco.mx', name: 'Ana Sofía Martínez', role: 'manager', branchId: 1, branchName: 'Roma Sur' },
      });
      const [entry] = (await attendanceRepository.getForgottenEntries(1)).filter((e) => e.id === '#ATT-SEED-2');
      const clockOut = new Date(new Date(entry.clockIn).getTime() + 8 * 3_600_000).toISOString();

      const closed = await attendanceRepository.closeEntry(entry.id, clockOut);

      expect(closed).toMatchObject({ clockOut, correctedBy: 'Ana Sofía Martínez' });
      expect((await attendanceRepository.getForgottenEntries(1)).some((e) => e.id === entry.id)).toBe(false);
      await expect(attendanceRepository.closeEntry(entry.id, clockOut)).rejects.toThrow(EntryAlreadyClosedError);
      await expect(attendanceRepository.closeEntry('nope', clockOut)).rejects.toThrow(EntryNotFoundError);
      useAuthStore.getState().clear();
    });
  });
});
