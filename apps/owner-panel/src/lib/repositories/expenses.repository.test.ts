import { describe, it, expect } from 'vitest';
import { expensesRepository, ExpenseNotFoundError } from './expenses.repository';
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

  // Spec 054: corregir y quitar lo capturado mal; la lista va del día más reciente al más viejo.
  it('lists the most recent day first', async () => {
    const dates = (await expensesRepository.getAll()).map((e) => e.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('create keeps the day it happened', async () => {
    const created = await expensesRepository.create({
      branchId: 2, category: 'supplies', description: 'Toallas', amount: 640, date: '2026-09-01',
    });
    expect(created.date).toBe('2026-09-01');
  });

  it('update replaces what was captured and keeps the day when none is sent', async () => {
    const created = await expensesRepository.create({
      branchId: 1, category: 'rent', description: 'Renta', amount: 12000, date: '2026-09-02',
    });

    const updated = await expensesRepository.update(created.id, {
      branchId: null, category: 'marketing', description: 'Renta corregida', amount: 1200,
    });

    expect(updated).toEqual({
      id: created.id, branchId: null, category: 'marketing', description: 'Renta corregida', amount: 1200, date: '2026-09-02',
    });
    expect((await expensesRepository.getAll()).find((e) => e.id === created.id)?.amount).toBe(1200);
  });

  it('remove takes it out, and touching it again is ExpenseNotFoundError', async () => {
    const created = await expensesRepository.create({
      branchId: 1, category: 'other', description: 'Duplicado', amount: 99,
    });

    await expensesRepository.remove(created.id);

    expect((await expensesRepository.getAll()).some((e) => e.id === created.id)).toBe(false);
    await expect(expensesRepository.remove(created.id)).rejects.toThrow(ExpenseNotFoundError);
    await expect(
      expensesRepository.update(created.id, { branchId: 1, category: 'other', description: 'x', amount: 1 }),
    ).rejects.toThrow(ExpenseNotFoundError);
  });
});
