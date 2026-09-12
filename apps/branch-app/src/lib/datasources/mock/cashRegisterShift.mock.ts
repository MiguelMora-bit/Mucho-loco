import type { CashRegisterShift, ShiftTransaction } from '@mucho-loco/types';
import { CASH_REGISTER_SHIFTS, COUNTER_SALES, MEMBERSHIP_PAYMENTS } from '../../data';
import { delay } from './delay';
import { ShiftNotFoundError, ShiftAlreadyClosedError } from '../../repositories/cashRegisterShift.errors';
import type { ICashRegisterShiftRepository } from '../../repositories/cashRegisterShift.repository';

function withinWindow(createdAt: string, shift: CashRegisterShift): boolean {
  const end = shift.closedAt ?? new Date().toISOString();
  return createdAt >= shift.openedAt && createdAt <= end;
}

export class CashRegisterShiftMockDatasource implements ICashRegisterShiftRepository {
  async getOpenShift(branchId: number): Promise<CashRegisterShift> {
    await delay(150);
    const existing = CASH_REGISTER_SHIFTS.find((s) => s.branchId === branchId && s.status === 'open');
    if (existing) return existing;

    const shift: CashRegisterShift = {
      id: `#SHIFT-${Date.now()}`,
      branchId,
      openedAt: new Date().toISOString(),
      closedAt: null,
      status: 'open',
    };
    CASH_REGISTER_SHIFTS.push(shift);
    return shift;
  }

  async getTransactions(shiftId: string): Promise<ShiftTransaction[]> {
    await delay(200);
    const shift = CASH_REGISTER_SHIFTS.find((s) => s.id === shiftId);
    if (!shift) throw new ShiftNotFoundError(shiftId);

    const saleTransactions: ShiftTransaction[] = COUNTER_SALES
      .filter((sale) => sale.branchId === shift.branchId && withinWindow(sale.createdAt, shift))
      .map((sale) => ({
        id: sale.id,
        kind: 'sale',
        description: sale.items.map((i) => `${i.qty}x ${i.productName}`).join(', '),
        amount: sale.total,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
      }));

    const membershipTransactions: ShiftTransaction[] = MEMBERSHIP_PAYMENTS
      .filter((payment) => payment.branchId === shift.branchId && withinWindow(payment.createdAt, shift))
      .map((payment) => ({
        id: payment.id,
        kind: 'membership',
        description: `${payment.isNewMember ? 'Alta' : 'Renovación'} — ${payment.memberName}`,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
      }));

    return [...saleTransactions, ...membershipTransactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getHistory(branchId: number): Promise<CashRegisterShift[]> {
    await delay(150);
    return CASH_REGISTER_SHIFTS
      .filter((s) => s.branchId === branchId && s.status === 'closed')
      .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
  }

  async closeShift(shiftId: string): Promise<CashRegisterShift> {
    await delay(200);
    const shift = CASH_REGISTER_SHIFTS.find((s) => s.id === shiftId);
    if (!shift) throw new ShiftNotFoundError(shiftId);
    if (shift.status === 'closed') throw new ShiftAlreadyClosedError(shiftId);

    shift.closedAt = new Date().toISOString();
    shift.status = 'closed';
    return shift;
  }
}
