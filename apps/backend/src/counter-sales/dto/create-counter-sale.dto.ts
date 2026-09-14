import { ArrayMinSize, IsIn, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { PaymentMethod } from '@mucho-loco/types';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer'];

export class CounterSalePickDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

/**
 * Igual que CreateOrderDto de la tienda: solo producto y cantidad. El precio
 * unitario y el total los pone el servidor desde el catálogo — que el cajero
 * escriba el precio a mano es precisamente lo que un punto de venta debe
 * impedir.
 */
export class CreateCounterSaleDto {
  @ValidateNested({ each: true })
  @Type(() => CounterSalePickDto)
  @ArrayMinSize(1)
  picks!: CounterSalePickDto[];

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;
}
