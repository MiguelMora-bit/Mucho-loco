import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Expense } from '@mucho-loco/types';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
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
  create(@Body() dto: CreateExpenseDto): Promise<Expense> {
    return this.expenses.create(dto);
  }
}
