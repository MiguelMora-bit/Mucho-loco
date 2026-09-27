import type { AttendanceEntry } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { attendanceRepository } from '../repositories/attendance.repository';
import { getCurrentBranchId } from '../currentBranch';

/** Turnos sin salida de la sucursal (spec 055) — vista de gerente. */
export const useForgottenShiftsStore = createAsyncResourceStore<AttendanceEntry[]>(() =>
  attendanceRepository.getForgottenEntries(getCurrentBranchId())
);
