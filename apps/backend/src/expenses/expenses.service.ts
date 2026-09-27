import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Expense, ExpenseCategory } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Expense as ExpenseRow } from '@prisma/client';
import { ExpenseDto } from './dto/expense.dto';
import { dayDate, mexicoDay } from '../memberships/visit-stats';
import { expenseNotFound, invalidExpenseDate } from '../common/error-codes';

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

/**
 * El día del gasto (spec 054): uno que exista en el calendario (`2026-02-30`
 * no) y que no sea futuro en CDMX. Sin fecha, hoy en CDMX — antes era `new
 * Date()`, y una captura de las 20:00 quedaba con el día siguiente.
 */
export function expenseDay(date: string | undefined, now: Date = new Date()): string {
  const today = mexicoDay(now);
  if (date === undefined) return today;
  const real = dayDate(date);
  if (Number.isNaN(real.getTime()) || real.toISOString().slice(0, 10) !== date || date > today) {
    throw new BadRequestException(invalidExpenseDate(date));
  }
  return date;
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Expense[]> {
    const rows = await this.prisma.expense.findMany({ orderBy: { date: 'desc' } });
    return rows.map(toExpense);
  }

  /** `branchId: null` = gasto corporativo (marketing nacional, nómina de HQ). */
  async create(dto: ExpenseDto): Promise<Expense> {
    const row = await this.prisma.expense.create({
      data: {
        branchId: dto.branchId ?? null,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: dayDate(expenseDay(dto.date)),
      },
    });
    return toExpense(row);
  }

  /** Corregir un gasto mal capturado (spec 054). Sin fecha, conserva la que tenía. */
  async update(id: string, dto: ExpenseDto): Promise<Expense> {
    const date = dto.date === undefined ? undefined : dayDate(expenseDay(dto.date));
    await this.findOrThrow(id);
    const row = await this.prisma.expense.update({
      where: { id },
      data: {
        branchId: dto.branchId ?? null,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        ...(date ? { date } : {}),
      },
    });
    return toExpense(row);
  }

  /** Quitar un gasto que no debió capturarse (spec 054): deja de contar en la P&L. */
  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.expense.deleteMany({ where: { id } });
    if (count === 0) throw new NotFoundException(expenseNotFound(id));
  }

  private async findOrThrow(id: string): Promise<ExpenseRow> {
    const row = await this.prisma.expense.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(expenseNotFound(id));
    return row;
  }
}
