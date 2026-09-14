import { IsInt, IsString, Min } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  productId!: string;

  @IsInt()
  fromBranchId!: number;

  @IsInt()
  toBranchId!: number;

  @IsInt()
  @Min(1)
  qty!: number;
}
