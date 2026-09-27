import type { Expense, ExpenseCategory } from '@mucho-loco/types';
import { EXPENSES } from '../../data';
import { delay } from './delay';
import type { IExpensesRepository } from '../../repositories/expenses.repository';
import { ExpenseNotFoundError } from '../../repositories/expenses.errors';
import { currentDay } from '../../currentMonth';

export interface CreateExpenseInput {
  branchId: number | null;
  category: ExpenseCategory;
  description: string;
  /** Pesos enteros. */
  amount: number;
  /** `YYYY-MM-DD`; sin ella, hoy en CDMX (alta) o la que tenía (edición). Spec 054. */
  date?: string;
}

/** Del día más reciente al más viejo, como `GET /expenses` del backend. */
const byDateDesc = (a: Expense, b: Expense) => b.date.localeCompare(a.date);

export class ExpensesMockDatasource implements IExpensesRepository {
  async getAll(): Promise<Expense[]> {
    await delay(160);
    return [...EXPENSES].sort(byDateDesc);
  }

  async create(input: CreateExpenseInput): Promise<Expense> {
    await delay(200);
    const expense: Expense = {
      id: `exp-${Date.now()}`,
      branchId: input.branchId,
      category: input.category,
      description: input.description,
      amount: input.amount,
      // Fecha sola, sin hora: un gasto es de un día (de CDMX), no de un
      // instante — lo mismo que devuelve el backend.
      date: input.date ?? currentDay(),
    };
    EXPENSES.push(expense);
    return expense;
  }

  async update(id: string, input: CreateExpenseInput): Promise<Expense> {
    await delay(200);
    const index = EXPENSES.findIndex((e) => e.id === id);
    if (index === -1) throw new ExpenseNotFoundError(id);
    const updated: Expense = {
      ...EXPENSES[index],
      branchId: input.branchId,
      category: input.category,
      description: input.description,
      amount: input.amount,
      date: input.date ?? EXPENSES[index].date,
    };
    EXPENSES[index] = updated;
    return updated;
  }

  async remove(id: string): Promise<void> {
    await delay(150);
    const index = EXPENSES.findIndex((e) => e.id === id);
    if (index === -1) throw new ExpenseNotFoundError(id);
    EXPENSES.splice(index, 1);
  }
}
