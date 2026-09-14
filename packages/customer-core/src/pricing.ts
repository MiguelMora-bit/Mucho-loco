import type { PlanKey } from '@mucho-loco/types';

/**
 * Membership price for a given branch, tier, and billing period, rounded to
 * the nearest 10 pesos (matches the price ladder shown in the mock data).
 */
export function calculateMembershipPrice(
  basePrice: number,
  tierFactor: number,
  periodMultiplier: number
): number {
  return Math.round((basePrice * tierFactor * periodMultiplier) / 10) * 10;
}

/**
 * Cuánto vale cada periodo en múltiplos de la mensualidad. Misma tabla que
 * `PERIOD_MULTIPLIERS` en `apps/backend/src/memberships/membership-plans.ts`,
 * que es el que COBRA; esta solo sirve para enseñar el precio antes de pagar.
 */
export const PERIOD_MULTIPLIERS: Record<PlanKey, number> = {
  visit: 0.12,
  weekly: 0.35,
  monthly: 1,
  quarterly: 2.7,
  annual: 9.5,
};

/** Formats a peso amount as "$X,XXX" — the one place this string shape gets built. */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

/**
 * Costo de envío a domicilio. El backend tiene su propia copia
 * (`HOME_SHIPPING_FEE` en `users.service.ts`) y ÉL es la autoridad — el total
 * que se cobra lo calcula el servidor, nunca el cliente. Esta constante solo
 * existe para que el resumen del carrito muestre la misma cifra antes de
 * mandar el pedido.
 */
export const HOME_SHIPPING_FEE = 99;
