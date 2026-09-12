import type { Expense, ExpenseCategory } from '@mucho-loco/types';
import { EXPENSES } from '../../data';
import { delay } from './delay';
import type { IExpensesRepository } from '../../repositories/expenses.repository';

export interface CreateExpenseInput {
  branchId: number | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
}

export class ExpensesMockDatasource implements IExpensesRepository {
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
      // Fecha sola, sin hora: un gasto es de un día, no de un instante — y es
      // lo que devuelve el backend (`toExpense` recorta a 10 caracteres). Si
      // el mock mandara el datetime completo, la lista se ordenaría distinto
      // según el modo.
      date: new Date().toISOString().slice(0, 10),
    };
    EXPENSES.push(expense);
    return expense;
  }
}
