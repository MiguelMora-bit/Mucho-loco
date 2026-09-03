import type { Expense } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { expensesRepository } from '../repositories/expenses.repository';

export const useExpensesStore = createAsyncResourceStore<Expense[]>(() => expensesRepository.getAll());
