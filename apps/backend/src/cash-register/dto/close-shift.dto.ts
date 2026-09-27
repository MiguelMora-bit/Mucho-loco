import { IsInt, Max, Min } from 'class-validator';

/** Spec 052: cerrar es arquear. Pesos enteros, como el resto del corte. */
export class CloseShiftDto {
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  countedCash!: number;
}
