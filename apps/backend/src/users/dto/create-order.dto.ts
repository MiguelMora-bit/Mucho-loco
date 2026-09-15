import {
  ArrayMinSize,
  IsIn,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Lang, OfflinePaymentMethod } from '@mucho-loco/types';

/**
 * Sin pasarela solo se puede pedir en efectivo (y se cobra al recoger). Antes
 * aceptaba 'card', 'transfer', 'mercadopago' y 'paypal' y creaba el pedido
 * como pagado sin cobrar nada. Todo pago en línea va por
 * POST /payments/checkout-sessions (Stripe).
 */
const OFFLINE_METHODS: OfflinePaymentMethod[] = ['cash'];
const LANGS: Lang[] = ['es', 'en'];

export class CreateOrderItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

/**
 * A propósito NO recibe `total` ni `name`/`flav`/`img` por item — el mock
 * (createOrder(email, items: OrderItem[], total, ...)) confiaba en lo que
 * mandaba el cliente, lo cual un backend real no puede hacer (un cliente
 * malicioso podría mandar cualquier total). Aquí solo se manda productId+qty
 * y el service recalcula precio/nombre/imagen desde el catálogo real — ver
 * UsersService.createOrder().
 */
export class CreateOrderDto {
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items!: CreateOrderItemDto[];

  @IsIn(OFFLINE_METHODS)
  paymentMethod!: OfflinePaymentMethod;

  /** Efectivo solo al recoger (CASH_REQUIRES_PICKUP): a domicilio siempre es
   *  por Stripe, y ahí va la dirección (CreateCheckoutSessionDto). */
  @IsIn(['pickup', 'home'])
  delivery!: 'pickup' | 'home';

  /** En qué idioma se congela name/flav del recibo — el catálogo (Product)
   *  vive en LocalizedString, pero un pedido es texto fijo, no
   *  retraducible (mismo criterio que ya documentó customer-app para
   *  OrderItem.name/.flav). No es información sensible, así que sí se
   *  confía en lo que manda el cliente (a diferencia de precio/nombre). */
  @IsIn(LANGS)
  lang!: Lang;
}
