import type { Lang, MembershipTier, PlanKey } from '@mucho-loco/types';

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
 * Precio de un tier para un periodo dado. Si el tier trae `basePrice` (el
 * caso de `all`: mismo precio en las 15 sucursales), ese número gana y
 * `branchPrice`/`factor` se ignoran — si no, se calcula como siempre
 * (`branchPrice × factor`). Punto único para no repetir el `?? ` en cada
 * pantalla que muestra un precio de membresía.
 */
export function resolveMembershipTierPrice(
  tier: Pick<MembershipTier, 'factor' | 'basePrice'>,
  branchPrice: number,
  periodMultiplier: number
): number {
  const base = tier.basePrice ?? branchPrice * tier.factor;
  return calculateMembershipPrice(base, 1, periodMultiplier);
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
 * Un monto de comprobante (un cobro, una factura): siempre con centavos y en
 * pesos, en el idioma de la pantalla. `formatPrice` es el formato del catálogo
 * — redondea y depende del locale del runtime —, no el de un recibo.
 */
export function formatMoney(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Costo de envío a domicilio. El backend tiene su propia copia
 * (`HOME_SHIPPING_FEE` en `users.service.ts`) y ÉL es la autoridad — el total
 * que se cobra lo calcula el servidor, nunca el cliente. Esta constante solo
 * existe para que el resumen del carrito muestre la misma cifra antes de
 * mandar el pedido.
 */
export const HOME_SHIPPING_FEE = 99;
