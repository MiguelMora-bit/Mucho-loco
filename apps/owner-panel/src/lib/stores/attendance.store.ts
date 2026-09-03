import type { AttendanceSummary } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { payrollRepository } from '../repositories/payroll.repository';

export const useAttendanceStore = createAsyncResourceStore<AttendanceSummary[]>(() => payrollRepository.getAttendance());
