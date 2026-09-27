import type { CashShiftAudit, ShiftTransaction } from '@mucho-loco/types';
import type { ICashAuditRepository } from '../../repositories/cashAudit.repository';
import { api } from './client';

/**
 * Cortes de caja (spec 052). El detalle reusa la ruta de transacciones de
 * branch-app: es de mostrador, y el dueño pasa porque los roles son
 * jerárquicos.
 */
export class CashAuditHttpDatasource implements ICashAuditRepository {
  getShifts(month: string, branchId?: number): Promise<CashShiftAudit[]> {
    return api.get<CashShiftAudit[]>('/cash-register/audit', { query: { month, branchId } });
  }

  getTransactions(shiftId: string): Promise<ShiftTransaction[]> {
    return api.get<ShiftTransaction[]>(`/cash-register/shifts/${encodeURIComponent(shiftId)}/transactions`);
  }
}
