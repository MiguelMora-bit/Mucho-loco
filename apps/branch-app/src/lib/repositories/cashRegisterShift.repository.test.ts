import { describe, it, expect } from 'vitest';
import { cashRegisterShiftRepository, ShiftAlreadyClosedError, ShiftNotFoundError } from './cashRegisterShift.repository';
import { counterSaleRepository } from './counterSale.repository';
import { MEMBERSHIP_PAYMENTS } from '../data';
import type { MembershipPayment } from '@mucho-loco/types';

const BRANCH_A = 1;
const BRANCH_B = 3; // Condesa — only used to prove branch isolation

function seedMembershipPayment(branchId: number, overrides: Partial<MembershipPayment> = {}): MembershipPayment {
  const payment: MembershipPayment = {
    id: `#MP-TEST-${Date.now()}-${Math.random()}`,
    branchId,
    qrCode: 'ML-QR-TEST',
    memberName: 'Test Member',
    phone: '',
    tierKey: 'single',
    periodKey: 'monthly',
    amount: 1090,
    paymentMethod: 'card',
    isNewMember: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
  MEMBERSHIP_PAYMENTS.push(payment);
  return payment;
}

describe('cashRegisterShiftRepository', () => {
  it('getOpenShift creates one for a branch with none, then returns the same one again', async () => {
    const first = await cashRegisterShiftRepository.getOpenShift(BRANCH_A);
    expect(first.status).toBe('open');
    expect(first.branchId).toBe(BRANCH_A);

    const second = await cashRegisterShiftRepository.getOpenShift(BRANCH_A);
    expect(second.id).toBe(first.id);
  });

  it('getTransactions includes sales and membership payments for that branch, excludes other branches', async () => {
    const shift = await cashRegisterShiftRepository.getOpenShift(BRANCH_A);

    const sale = await counterSaleRepository.createSale(BRANCH_A, [{ productId: 'p9', qty: 1 }], 'cash');
    const payment = seedMembershipPayment(BRANCH_A, { paymentMethod: 'card', amount: 1090 });
    seedMembershipPayment(BRANCH_B, { paymentMethod: 'cash', amount: 500 }); // must NOT show up

    const transactions = await cashRegisterShiftRepository.getTransactions(shift.id);

    expect(transactions.some((t) => t.id === sale.id && t.kind === 'sale' && t.amount === sale.total)).toBe(true);
    expect(transactions.some((t) => t.id === payment.id && t.kind === 'membership' && t.amount === 1090)).toBe(true);
    expect(transactions.some((t) => t.amount === 500)).toBe(false);
  });

  it('getTransactions throws for an unknown shift id', async () => {
    await expect(cashRegisterShiftRepository.getTransactions('nope')).rejects.toThrow(ShiftNotFoundError);
  });

  it('closeShift closes the shift, and getOpenShift then opens a fresh one', async () => {
    const shift = await cashRegisterShiftRepository.getOpenShift(BRANCH_A);
    const closed = await cashRegisterShiftRepository.closeShift(shift.id);
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).not.toBeNull();

    const nextOpen = await cashRegisterShiftRepository.getOpenShift(BRANCH_A);
    expect(nextOpen.id).not.toBe(shift.id);
    expect(nextOpen.status).toBe('open');
  });

  it('closeShift rejects closing the same shift twice', async () => {
    const shift = await cashRegisterShiftRepository.getOpenShift(BRANCH_A);
    await cashRegisterShiftRepository.closeShift(shift.id);
    await expect(cashRegisterShiftRepository.closeShift(shift.id)).rejects.toThrow(ShiftAlreadyClosedError);
  });

  it('closeShift rejects an unknown shift id', async () => {
    await expect(cashRegisterShiftRepository.closeShift('nope')).rejects.toThrow(ShiftNotFoundError);
  });

  it('getHistory returns only closed shifts for that branch', async () => {
    const history = await cashRegisterShiftRepository.getHistory(BRANCH_A);
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((s) => s.status === 'closed' && s.branchId === BRANCH_A)).toBe(true);
  });
});
