import type { AttendanceEntry } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { attendanceRepository } from '../repositories/attendance.repository';
import { useAuthStore } from './auth.store';

function getCurrentStaffEmail(): string {
  const email = useAuthStore.getState().user?.email;
  if (!email) {
    throw new Error('getCurrentStaffEmail() llamado sin sesión de staff activa');
  }
  return email;
}

export const useMyAttendanceStore = createAsyncResourceStore<AttendanceEntry | null>(() =>
  attendanceRepository.getOpenEntry(getCurrentStaffEmail())
);
