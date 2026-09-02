import type { PlanKey, TierKey } from '@mucho-loco/types';

// Roma Sur — mirrors Branch.price for id:1 in customer-app's mock data.
export const CURRENT_BRANCH_PRICE = 1090;

export const TIER_FACTORS: Record<TierKey, number> = { single: 1, all: 1.5 };

// Same multipliers as planMultiplier in customer-app/components/
// MuchoLoco.tsx — keep in sync by hand until a real backend becomes the
// single source of pricing.
export const PERIOD_MULTIPLIERS: Record<PlanKey, number> = {
  visit: 0.12,
  weekly: 0.35,
  monthly: 1,
  quarterly: 2.7,
  annual: 9.5,
};

// How many days of validity each period grants — used to calculate
// expiresAt on sign-up or renewal. No equivalent in customer-app because
// it never computes an expiration date there, only a price.
export const PERIOD_DAYS: Record<PlanKey, number> = {
  visit: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  annual: 365,
};
