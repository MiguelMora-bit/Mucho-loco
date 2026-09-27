import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import type { ExpenseCategory } from '@mucho-loco/types';

const CATEGORIES: ExpenseCategory[] = [
  'rent',
  'utilities',
  'maintenance',
  'supplies',
  'marketing',
  'other',
];

/** Alta y edición de un gasto (spec 054: la edición reemplaza todo lo capturado). */
export class ExpenseDto {
  /** null a propósito, no ausente: "gasto de toda la cadena" es una elección
   *  explícita del dueño, no un campo que se le olvidó llenar. */
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsInt()
  branchId!: number | null;

  @IsIn(CATEGORIES)
  category!: ExpenseCategory;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description!: string;

  /** Pesos enteros, como el resto de sucursal y HQ. */
  @IsInt()
  @Min(1)
  amount!: number;

  /** `YYYY-MM-DD`. En el alta, sin fecha = hoy en CDMX; en la edición, conserva la que tenía. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}
