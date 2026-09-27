import { IsEmail, IsISO8601, IsString, MinLength } from 'class-validator';

export class ClockInDto {
  @IsEmail()
  staffEmail!: string;

  @IsString()
  @MinLength(1)
  staffName!: string;
}

export class ClockOutDto {
  @IsEmail()
  staffEmail!: string;
}

/** Spec 055: la hora real de salida (instante ISO) de un turno que quedó abierto. */
export class CloseEntryDto {
  @IsISO8601({ strict: true })
  clockOut!: string;
}
