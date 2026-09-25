import { Matches } from 'class-validator';

/**
 * Solo el teléfono (spec 015): nombre y correo vienen del login. En E.164,
 * igual que el de la dirección de envío — el cliente lo normaliza con
 * `toE164` de customer-core antes de mandarlo.
 */
export class UpdatePhoneDto {
  @Matches(/^\+\d{8,15}$/)
  phone!: string;
}
