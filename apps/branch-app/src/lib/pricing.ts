/**
 * Membership price for a given branch, tier, and billing period, rounded to
 * the nearest 10 pesos. Duplicated verbatim from customer-app/lib/pricing.ts
 * — 3 lines of pure math, not worth a shared package for.
 */
export function calculateMembershipPrice(basePrice: number, tierFactor: number, periodMultiplier: number): number {
  return Math.round((basePrice * tierFactor * periodMultiplier) / 10) * 10;
}
