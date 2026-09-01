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

/** Formats a peso amount as "$X,XXX" — the one place this string shape gets built. */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
