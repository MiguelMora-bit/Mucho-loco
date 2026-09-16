import type { PlanKey, TierKey } from '@mucho-loco/types';

/**
 * Tabla de precios de membresía. Duplicada hoy en tres lugares
 * (customer-app/lib/pricing.ts, branch-app/lib/membershipPlans.ts y aquí) —
 * pero a partir de ahora ESTE es el que cobra de verdad: el precio de una
 * venta de mostrador lo calcula el servidor, no la SPA. Los otros dos quedan
 * solo para previsualizar el importe antes de cobrar, igual que
 * HOME_SHIPPING_FEE en la tienda.
 */
export const TIER_FACTORS: Record<TierKey, number> = { single: 1, all: 1.5 };

/**
 * Mismo precio en las 15 sucursales para `all` (regla de negocio 2026-09-15)
 * — deja de ser branch.price × factor. Provisional: promedio de las 15
 * sucursales × el factor 1.5 anterior, redondeado a la decena; el monto
 * final lo confirma el dueño del negocio. Espejo de TIER_BASE_PRICES en
 * customer-core/data.ts y branch-app/lib/membershipPlans.ts — los tres
 * tienen que mostrar y cobrar el mismo número.
 */
export const TIER_BASE_PRICES: Partial<Record<TierKey, number>> = { all: 1550 };

export const PERIOD_MULTIPLIERS: Record<PlanKey, number> = {
  visit: 0.12,
  weekly: 0.35,
  monthly: 1,
  quarterly: 2.7,
  annual: 9.5,
};

/** Cómo se llama cada periodo en Checkout de Stripe y en los renglones de cobro. */
export const PERIOD_NAME: Record<PlanKey, string> = {
  visit: 'Visita',
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
};

/** Días de vigencia que otorga cada periodo — se usan para calcular expiresAt. */
export const PERIOD_DAYS: Record<PlanKey, number> = {
  visit: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  annual: 365,
};

/**
 * Redondeado a la decena, igual que calculateMembershipPrice de los
 * frontends. `basePrice` (el precio de la sucursal que cobra) se ignora para
 * un tier que tenga entrada en TIER_BASE_PRICES — hoy solo `all`.
 */
export function calculateMembershipPrice(
  basePrice: number,
  tierKey: TierKey,
  periodKey: PlanKey,
): number {
  const tierBase = TIER_BASE_PRICES[tierKey] ?? basePrice * TIER_FACTORS[tierKey];
  return Math.round((tierBase * PERIOD_MULTIPLIERS[periodKey]) / 10) * 10;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
