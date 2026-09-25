import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { CardType, PaymentMethod, PlanKey, TierKey } from '@mucho-loco/types';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer'];
const TIER_KEYS: TierKey[] = ['single', 'all'];
const PERIOD_KEYS: PlanKey[] = ['visit', 'weekly', 'monthly', 'quarterly', 'annual'];

/** No lleva `amount`: el importe lo calcula el servidor desde el precio de la
 *  sucursal y la tabla de planes — misma regla que la tienda y el mostrador. */
export class RenewMembershipDto {
  @IsString()
  qrCode!: string;

  @IsIn(TIER_KEYS)
  tierKey!: TierKey;

  @IsIn(PERIOD_KEYS)
  periodKey!: PlanKey;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;

  /** Crédito o débito (spec 009). Solo cuenta con `card`. */
  @IsOptional()
  @IsIn(['credit', 'debit'])
  cardType?: CardType;
}

export class SignUpMemberDto {
  @IsString()
  @MinLength(1)
  memberName!: string;

  @IsString()
  phone!: string;

  @IsIn(TIER_KEYS)
  tierKey!: TierKey;

  @IsIn(PERIOD_KEYS)
  periodKey!: PlanKey;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;

  /** Crédito o débito (spec 009). Solo cuenta con `card`. */
  @IsOptional()
  @IsIn(['credit', 'debit'])
  cardType?: CardType;

  /** Presente cuando el alta se hizo por huella en vez de QR. */
  @IsOptional()
  @IsString()
  fingerprintId?: string;
}

/**
 * Validar en mostrador (spec 012). Exactamente uno de los tres — el controller
 * lo exige: dos a la vez es ambiguo, ninguno no busca a nadie.
 */
export class CheckInDto {
  @IsOptional()
  @IsString()
  qrCode?: string;

  @IsOptional()
  @IsString()
  fingerprintId?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
