import type { CashRegisterShift, ShiftTransaction } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { cashRegisterShiftRepository } from '../repositories/cashRegisterShift.repository';
import { getCurrentBranchId } from '../currentBranch';

export interface CashRegisterView {
  shift: CashRegisterShift;
  transactions: ShiftTransaction[];
  history: CashRegisterShift[];
}

export const useCashRegisterShiftStore = createAsyncResourceStore<CashRegisterView>(async () => {
  const branchId = getCurrentBranchId();
  const shift = await cashRegisterShiftRepository.getOpenShift(branchId);
  const [transactions, history] = await Promise.all([
    cashRegisterShiftRepository.getTransactions(shift.id),
    cashRegisterShiftRepository.getHistory(branchId),
  ]);
  return { shift, transactions, history };
});
