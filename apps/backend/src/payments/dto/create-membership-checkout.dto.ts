import { IsIn, IsInt, IsString, Min } from 'class-validator';
import type {
  Lang,
  MembershipPlanChoice,
  PlanKey,
  TierKey,
} from '@mucho-loco/types';

const LANGS: Lang[] = ['es', 'en'];
const TIERS: TierKey[] = ['single', 'all'];
const PERIODS: PlanKey[] = [
  'visit',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
];

/**
 * Lo que el socio elige al contratar — sucursal, alcance y duración — y nada
 * más. Sin importe, igual que `CreateCheckoutSessionDto`: el precio lo calcula
 * el servidor desde la sucursal, y `forbidNonWhitelisted` rechaza un `amount`
 * que alguien intente colar.
 */
export class CreateMembershipCheckoutDto implements MembershipPlanChoice {
  @IsInt()
  @Min(1)
  branchId!: number;

  @IsIn(TIERS)
  tierKey!: TierKey;

  @IsIn(PERIODS)
  periodKey!: PlanKey;

  @IsIn(LANGS)
  lang!: Lang;

  /** A dónde vuelve el socio. El backend le pega el `session_id` a la de éxito. */
  @IsString()
  successUrl!: string;

  @IsString()
  cancelUrl!: string;
}

/** Abrir el portal de cliente de Stripe (spec 005): solo a dónde volver y en qué idioma. */
export class BillingPortalDto {
  @IsString()
  returnUrl!: string;

  @IsIn(LANGS)
  lang!: Lang;
}
