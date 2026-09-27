import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import type { Expense } from '@mucho-loco/types';
import { ExpensesService } from './expenses.service';
import { ExpenseDto } from './dto/expense.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('expenses')
@Roles('owner')
export class ExpensesController {
  constructor(private expenses: ExpensesService) {}

  @Get()
  getAll(): Promise<Expense[]> {
    return this.expenses.getAll();
  }

  @Post()
  create(@Body() dto: ExpenseDto): Promise<Expense> {
    return this.expenses.create(dto);
  }

  /** Corregir lo capturado (spec 054). */
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: ExpenseDto): Promise<Expense> {
    return this.expenses.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.expenses.remove(id);
  }
}
