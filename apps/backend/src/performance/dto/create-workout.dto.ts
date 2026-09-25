import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Lo que el socio registra (spec 017). Mismos límites que `WORKOUT_LIMITS` de
 * customer-core, que valida antes de mandar. Nada de lo derivado (series,
 * volumen, récords) viaja: con `forbidNonWhitelisted` se rechaza.
 */
export class WorkoutSetDto {
  @IsInt()
  @Min(1)
  @Max(100)
  reps!: number;

  /** 0 = peso corporal. */
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(500)
  weightKg!: number;
}

export class WorkoutExerciseDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(60)
  name!: string;

  @ValidateNested({ each: true })
  @Type(() => WorkoutSetDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  sets!: WorkoutSetDto[];
}

export class CreateWorkoutDto {
  /** Día sin hora. Que no sea futuro lo revisa el servicio (depende de "hoy" en CDMX). */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes!: number | null;

  @ValidateNested({ each: true })
  @Type(() => WorkoutExerciseDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  exercises!: WorkoutExerciseDto[];
}
