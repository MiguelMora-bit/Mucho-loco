import type { Expense } from '@mucho-loco/types';
import type { IExpensesRepository } from '../../repositories/expenses.repository';
import type { CreateExpenseInput } from '../../datasources/mock/expenses.mock';
import { ExpenseNotFoundError } from '../../repositories/expenses.errors';
import { ApiRequestError, api } from './client';

function toDomainError(e: unknown, id: string): unknown {
  return e instanceof ApiRequestError && e.code === 'EXPENSE_NOT_FOUND' ? new ExpenseNotFoundError(id) : e;
}

/** Lo que viaja: `branchId` siempre (null = corporativo), y la fecha solo si se eligió. */
function bodyOf(input: CreateExpenseInput) {
  return {
    branchId: input.branchId,
    category: input.category,
    description: input.description,
    amount: input.amount,
    ...(input.date ? { date: input.date } : {}),
  };
}

export class ExpensesHttpDatasource implements IExpensesRepository {
  getAll(): Promise<Expense[]> {
    return api.get<Expense[]>('/expenses');
  }

  /** `branchId: null` = gasto corporativo, y viaja explícito: es una elección del dueño, no un campo sin llenar. */
  create(input: CreateExpenseInput): Promise<Expense> {
    return api.post<Expense>('/expenses', bodyOf(input));
  }

  async update(id: string, input: CreateExpenseInput): Promise<Expense> {
    try {
      return await api.put<Expense>(`/expenses/${encodeURIComponent(id)}`, bodyOf(input));
    } catch (e) {
      throw toDomainError(e, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await api.delete(`/expenses/${encodeURIComponent(id)}`);
    } catch (e) {
      throw toDomainError(e, id);
    }
  }
}
