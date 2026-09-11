import type { AttendanceEntry } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { attendanceRepository } from '../repositories/attendance.repository';
import { getCurrentBranchId } from '../currentBranch';

export const useTeamAttendanceStore = createAsyncResourceStore<AttendanceEntry[]>(() =>
  attendanceRepository.getTeamToday(getCurrentBranchId())
);
