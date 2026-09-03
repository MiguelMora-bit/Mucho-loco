import { describe, it, expect } from 'vitest';
import { expensesRepository } from './expenses.repository';
import { EXPENSES } from '../data';

describe('expensesRepository', () => {
  it('getAll returns every mock expense', async () => {
    const expenses = await expensesRepository.getAll();
    expect(expenses).toHaveLength(EXPENSES.length);
  });

  it('create adds a branch-tied expense and it shows up in getAll', async () => {
    const before = (await expensesRepository.getAll()).length;
    const created = await expensesRepository.create({
      branchId: 1,
      category: 'supplies',
      description: 'Test supply run',
      amount: 500,
    });
    expect(created.branchId).toBe(1);
    const after = await expensesRepository.getAll();
    expect(after).toHaveLength(before + 1);
  });

  it('create supports a corporate-wide expense with branchId null', async () => {
    const created = await expensesRepository.create({
      branchId: null,
      category: 'marketing',
      description: 'Test campaign',
      amount: 1000,
    });
    expect(created.branchId).toBeNull();
  });
});
