import { IsEmail, IsString, MinLength } from 'class-validator';

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
