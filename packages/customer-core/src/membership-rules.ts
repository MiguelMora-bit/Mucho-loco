import type { MembershipInfo, PlanKey } from '@mucho-loco/types';
import type { MembershipErrorCode } from './membership-errors';

/**
 * Las reglas de contratación que aplica el backend
 * (`MembershipBillingService.createCheckout`), del lado del socio. Aquí para
 * que las dos pantallas (web y móvil) no ofrezcan un botón que va a rebotar, y
 * para que el mock rechace exactamente lo mismo que el backend. La autoridad
 * sigue siendo el backend: si esto se desviara, él igual responde 409.
 */

/** Espejo de `MIN_CARRY_OVER_MS` del backend: Stripe pide `trial_end` a más de 48 h. */
export const MIN_CARRY_OVER_MS = 3 * 86_400_000;

export type PurchaseBlock = Extract<MembershipErrorCode, 'ALREADY_SUBSCRIBED' | 'MEMBERSHIP_STILL_ACTIVE'>;

/** Por qué el backend rechazaría esta compra, o `null` si la acepta. */
export function purchaseBlock(membership: MembershipInfo | null, periodKey: PlanKey): PurchaseBlock | null {
  // Una segunda suscripción viva le cobraría dos veces — también si canceló la
  // renovación en el portal: sigue viva hasta el fin del periodo (spec 005).
  if (membership?.hasSubscription && membership.status === 'active') return 'ALREADY_SUBSCRIBED';
  // Una visita encima de una membresía vigente no le agrega nada.
  if (periodKey === 'visit' && membership && membership.status !== 'expired') return 'MEMBERSHIP_STILL_ACTIVE';
  return null;
}

/**
 * Si el socio renueva con tiempo ya pagado (en mostrador, por ejemplo), el
 * día en que cae el primer cobro del plan nuevo — lo que ya pagó no se pierde.
 * `null` si el plan nuevo arranca hoy. Solo aplica a planes que se renuevan.
 *
 * Lee el reloj: en Next, llamarla en el Server Component (corre una vez por
 * request) y no durante el render de un Client Component; en el móvil, al
 * cargar los datos y no al pintar.
 */
export function renewalStartsOn(membership: MembershipInfo | null, now: number = Date.now()): string | null {
  if (!membership || membership.hasSubscription || membership.status !== 'active') return null;
  return Date.parse(membership.expiresAt) - now > MIN_CARRY_OVER_MS ? membership.expiresAt : null;
}
