import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import type { ShippingAddress } from '@mucho-loco/types';

/**
 * Dirección de un pedido a domicilio. Mismas reglas que
 * `parseShippingAddress` de customer-core (lo que marca los campos en la
 * pantalla); aquí es donde valen. El teléfono llega ya en E.164: los dos
 * clientes lo normalizan antes de mandarlo.
 */
export class ShippingAddressDto implements ShippingAddress {
  @IsString()
  @Length(3, 120)
  street!: string;

  @IsString()
  @Length(2, 80)
  neighborhood!: string;

  @IsString()
  @Length(2, 80)
  city!: string;

  @IsString()
  @Length(2, 40)
  state!: string;

  @Matches(/^\d{5}$/)
  postalCode!: string;

  @Matches(/^\+\d{8,15}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  references?: string;
}
