import type { CashShiftAudit, ShiftTransaction } from '@mucho-loco/types';
import { CASH_SHIFT_AUDITS, SHIFT_TRANSACTIONS } from '../../data';
import { inMonth } from '../../currentMonth';
import { delay } from './delay';
import type { ICashAuditRepository } from '../../repositories/cashAudit.repository';

export class CashAuditMockDatasource implements ICashAuditRepository {
  async getShifts(month: string, branchId?: number): Promise<CashShiftAudit[]> {
    await delay(150);
    return CASH_SHIFT_AUDITS
      .filter((s) => inMonth(s.closedAt, month) && (branchId === undefined || s.branchId === branchId))
      .sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  }

  async getTransactions(shiftId: string): Promise<ShiftTransaction[]> {
    await delay(120);
    return SHIFT_TRANSACTIONS[shiftId] ?? [];
  }
}
