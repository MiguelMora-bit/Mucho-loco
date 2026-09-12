import { ArrayMinSize, IsIn, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { Lang } from '@mucho-loco/types';
import { CreateOrderItemDto } from '../../users/dto/create-order.dto';

const LANGS: Lang[] = ['es', 'en'];

/**
 * Mismo contenido que `CreateOrderDto` menos `paymentMethod`: aquí el método
 * de pago lo elige el socio DENTRO de Stripe, y cuál se le ofrece lo decide
 * Stripe según país, monto y dispositivo (dynamic payment methods). Fijarlo
 * desde el código apagaría eso y bajaría la conversión.
 */
export class CreateCheckoutSessionDto {
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items!: CreateOrderItemDto[];

  @IsIn(['pickup', 'home'])
  delivery!: 'pickup' | 'home';

  @IsIn(LANGS)
  lang!: Lang;

  /** A dónde vuelve el socio. El backend le pega el `session_id` a la de éxito. */
  @IsString()
  successUrl!: string;

  @IsString()
  cancelUrl!: string;
}
