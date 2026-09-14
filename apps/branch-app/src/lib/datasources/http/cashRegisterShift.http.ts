import type { CashRegisterShift, ShiftTransaction } from '@mucho-loco/types';
import type { ICashRegisterShiftRepository } from '../../repositories/cashRegisterShift.repository';
import {
  ShiftAlreadyClosedError,
  ShiftNotFoundError,
} from '../../repositories/cashRegisterShift.errors';
import { ApiRequestError, api } from './client';

/** Traduce el código del backend al error tipado que promete el contrato. */
function toDomainError(e: unknown): unknown {
  if (!(e instanceof ApiRequestError)) return e;
  const shiftId = String(e.body.shiftId ?? '');
  switch (e.code) {
    case 'SHIFT_NOT_FOUND':
      return new ShiftNotFoundError(shiftId);
    case 'SHIFT_ALREADY_CLOSED':
      return new ShiftAlreadyClosedError(shiftId);
    default:
      return e;
  }
}

export class CashRegisterShiftHttpDatasource implements ICashRegisterShiftRepository {
  /** Abre el turno si la sucursal no tenía uno — el backend lo resuelve, aquí es una lectura. */
  getOpenShift(branchId: number): Promise<CashRegisterShift> {
    return api.get<CashRegisterShift>(`/branches/${branchId}/cash-register/open-shift`);
  }

  async getTransactions(shiftId: string): Promise<ShiftTransaction[]> {
    try {
      return await api.get<ShiftTransaction[]>(`/cash-register/shifts/${shiftId}/transactions`);
    } catch (e) {
      throw toDomainError(e);
    }
  }

  getHistory(branchId: number): Promise<CashRegisterShift[]> {
    return api.get<CashRegisterShift[]>(`/branches/${branchId}/cash-register/history`);
  }

  async closeShift(shiftId: string): Promise<CashRegisterShift> {
    try {
      return await api.post<CashRegisterShift>(`/cash-register/shifts/${shiftId}/close`);
    } catch (e) {
      throw toDomainError(e);
    }
  }
}
