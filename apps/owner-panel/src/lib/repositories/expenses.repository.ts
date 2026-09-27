import type { Expense } from '@mucho-loco/types';
import { ExpensesMockDatasource } from '../datasources/mock/expenses.mock';
import { ExpensesHttpDatasource } from '../datasources/http/expenses.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';
import type { CreateExpenseInput } from '../datasources/mock/expenses.mock';

export type { CreateExpenseInput };
export { ExpenseNotFoundError } from './expenses.errors';

export interface IExpensesRepository {
  getAll(): Promise<Expense[]>;
  create(input: CreateExpenseInput): Promise<Expense>;
  /** Corregir lo capturado (spec 054). Sin `date`, conserva la que tenía. */
  update(id: string, input: CreateExpenseInput): Promise<Expense>;
  remove(id: string): Promise<void>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const expensesRepository: IExpensesRepository = isHttpDatasourceEnabled()
  ? new ExpensesHttpDatasource()
  : new ExpensesMockDatasource();
