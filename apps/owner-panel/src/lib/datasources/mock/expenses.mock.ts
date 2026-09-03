import type { Expense, ExpenseCategory } from '@mucho-loco/types';
import { EXPENSES } from '../../data';
import { delay } from './delay';

export interface CreateExpenseInput {
  branchId: number | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
}

export class ExpensesMockDatasource {
  async getAll(): Promise<Expense[]> {
    await delay(160);
    return EXPENSES;
  }

  async create(input: CreateExpenseInput): Promise<Expense> {
    await delay(200);
    const expense: Expense = {
      id: `exp-${Date.now()}`,
      branchId: input.branchId,
      category: input.category,
      description: input.description,
      amount: input.amount,
      date: new Date().toISOString(),
    };
    EXPENSES.push(expense);
    return expense;
  }
}
