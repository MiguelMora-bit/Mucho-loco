import type { AttendanceSummary, Employee, PayrollPeriod, Payslip } from '@mucho-loco/types';
import type { IPayrollRepository } from '../../repositories/payroll.repository';
import {
  PeriodAlreadyClosedError,
  PeriodAlreadyOpenError,
  PeriodNotFoundError,
} from '../../repositories/payroll.errors';
import { ApiRequestError, api } from './client';

function toDomainError(e: unknown): unknown {
  if (!(e instanceof ApiRequestError)) return e;
  const periodId = String(e.body.periodId ?? '');
  switch (e.code) {
    case 'PERIOD_NOT_FOUND':
      return new PeriodNotFoundError(periodId);
    case 'PERIOD_ALREADY_CLOSED':
      return new PeriodAlreadyClosedError(periodId);
    case 'PERIOD_ALREADY_OPEN':
      return new PeriodAlreadyOpenError(periodId);
    default:
      return e;
  }
}

/**
 * Nómina.
 *
 * El cambio de fondo al conectar aquí no se ve en este archivo pero es el
 * importante: `getAttendance()` deja de leer un `ATTENDANCE_SUMMARIES`
 * pre-cargado y devuelve los días que `branch-app` fichó DE VERDAD — era el
 * pendiente explícito de la Fase 3 (ver CLAUDE.md raíz).
 *
 * Y el cálculo deja de correr en el navegador: `runPayroll` ya no calcula
 * nada, pide al backend que emita los recibos. `lib/payroll.ts` sigue vivo
 * porque lo usa el mock, pero en modo HTTP no se ejecuta.
 */
export class PayrollHttpDatasource implements IPayrollRepository {
  getEmployees(): Promise<Employee[]> {
    return api.get<Employee[]>('/payroll/employees');
  }

  getPeriods(): Promise<PayrollPeriod[]> {
    return api.get<PayrollPeriod[]>('/payroll/periods');
  }

  getAttendance(): Promise<AttendanceSummary[]> {
    return api.get<AttendanceSummary[]>('/payroll/attendance');
  }

  getPayslips(): Promise<Payslip[]> {
    return api.get<Payslip[]>('/payroll/payslips');
  }

  async runPayroll(periodId: string): Promise<Payslip[]> {
    try {
      return await api.post<Payslip[]>(`/payroll/periods/${periodId}/run`);
    } catch (e) {
      throw toDomainError(e);
    }
  }

  async openNextPeriod(): Promise<PayrollPeriod> {
    try {
      return await api.post<PayrollPeriod>('/payroll/periods/next');
    } catch (e) {
      throw toDomainError(e);
    }
  }
}
