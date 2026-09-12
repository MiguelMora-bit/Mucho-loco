import type { Expense } from '@mucho-loco/types';
import { ExpensesMockDatasource } from '../datasources/mock/expenses.mock';
import { ExpensesHttpDatasource } from '../datasources/http/expenses.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';
import type { CreateExpenseInput } from '../datasources/mock/expenses.mock';

export type { CreateExpenseInput };

export interface IExpensesRepository {
  getAll(): Promise<Expense[]>;
  create(input: CreateExpenseInput): Promise<Expense>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const expensesRepository: IExpensesRepository = isHttpDatasourceEnabled()
  ? new ExpensesHttpDatasource()
  : new ExpensesMockDatasource();
