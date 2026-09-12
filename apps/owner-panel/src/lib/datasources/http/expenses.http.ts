import type { Expense } from '@mucho-loco/types';
import type { IExpensesRepository } from '../../repositories/expenses.repository';
import type { CreateExpenseInput } from '../../datasources/mock/expenses.mock';
import { api } from './client';

export class ExpensesHttpDatasource implements IExpensesRepository {
  getAll(): Promise<Expense[]> {
    return api.get<Expense[]>('/expenses');
  }

  /** `branchId: null` = gasto corporativo, y viaja explícito: es una elección del dueño, no un campo sin llenar. */
  create(input: CreateExpenseInput): Promise<Expense> {
    return api.post<Expense>('/expenses', {
      branchId: input.branchId,
      category: input.category,
      description: input.description,
      amount: input.amount,
    });
  }
}
