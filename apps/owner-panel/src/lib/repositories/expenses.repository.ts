import type { Expense } from '@mucho-loco/types';
import { ExpensesMockDatasource } from '../datasources/mock/expenses.mock';
import type { CreateExpenseInput } from '../datasources/mock/expenses.mock';

export type { CreateExpenseInput };

export interface IExpensesRepository {
  getAll(): Promise<Expense[]>;
  create(input: CreateExpenseInput): Promise<Expense>;
}

// Swap this line to plug in a real API datasource
export const expensesRepository: IExpensesRepository = new ExpensesMockDatasource();
