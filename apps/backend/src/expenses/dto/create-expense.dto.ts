import { IsIn, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import type { ExpenseCategory } from '@mucho-loco/types';

const CATEGORIES: ExpenseCategory[] = [
  'rent',
  'utilities',
  'maintenance',
  'supplies',
  'marketing',
  'other',
];

export class CreateExpenseDto {
  /** null a propósito, no ausente: "gasto de toda la cadena" es una elección
   *  explícita del dueño, no un campo que se le olvidó llenar. */
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsInt()
  branchId!: number | null;

  @IsIn(CATEGORIES)
  category!: ExpenseCategory;

  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  amount!: number;
}
