import { describe, it, expect } from 'vitest';
import { cashAuditRepository } from './cashAudit.repository';
import { CASH_SHIFT_AUDITS } from '../data';
import { currentMonth, inMonth } from '../currentMonth';

describe('cashAuditRepository (mock, spec 052)', () => {
  it('lists the closed shifts of the month, the latest close first', async () => {
    const month = currentMonth();
    const shifts = await cashAuditRepository.getShifts(month);

    expect(shifts).toHaveLength(CASH_SHIFT_AUDITS.filter((s) => inMonth(s.closedAt, month)).length);
    expect(shifts.map((s) => s.closedAt)).toEqual([...shifts.map((s) => s.closedAt)].sort().reverse());
  });

  it('narrows to one branch', async () => {
    const condesa = CASH_SHIFT_AUDITS.find((s) => s.branchId === 3)!;
    const shifts = await cashAuditRepository.getShifts(currentMonth(new Date(condesa.closedAt)), 3);

    expect(shifts.map((s) => s.id)).toContain(condesa.id);
    expect(shifts.every((s) => s.branchId === 3)).toBe(true);
  });

  it('computes the difference the way the backend does: counted minus expected cash', () => {
    for (const s of CASH_SHIFT_AUDITS) {
      if (s.totals && s.countedCash !== null) expect(s.difference).toBe(s.countedCash - s.totals.cash);
      else expect(s.difference).toBeNull();
    }
  });

  it('the transactions add up to the frozen totals', async () => {
    for (const s of CASH_SHIFT_AUDITS.filter((a) => a.totals)) {
      const transactions = await cashAuditRepository.getTransactions(s.id);
      const cash = transactions.filter((t) => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.amount, 0);
      expect(cash).toBe(s.totals!.cash);
      expect(transactions).toHaveLength(s.transactionCount!);
    }
  });

  it('an unknown shift has no transactions', async () => {
    expect(await cashAuditRepository.getTransactions('nope')).toEqual([]);
  });
});
