import { Injectable } from '@nestjs/common';
import type { Expense, ExpenseCategory } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Expense as ExpenseRow } from '@prisma/client';
import { CreateExpenseDto } from './dto/create-expense.dto';

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    branchId: row.branchId,
    category: row.category as ExpenseCategory,
    description: row.description,
    amount: row.amount,
    // Fecha sola, sin hora: un gasto es de un día, no de un instante.
    date: row.date.toISOString().slice(0, 10),
  };
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Expense[]> {
    const rows = await this.prisma.expense.findMany({ orderBy: { date: 'desc' } });
    return rows.map(toExpense);
  }

  /** `branchId: null` = gasto corporativo (marketing nacional, nómina de HQ). */
  async create(dto: CreateExpenseDto): Promise<Expense> {
    const row = await this.prisma.expense.create({
      data: {
        branchId: dto.branchId ?? null,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: new Date(),
      },
    });
    return toExpense(row);
  }
}
