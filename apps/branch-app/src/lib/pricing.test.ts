import { describe, it, expect } from 'vitest';
import { calculateMembershipPrice } from './pricing';
import { CURRENT_BRANCH_PRICE, TIER_BASE_PRICES, TIER_FACTORS, PERIOD_MULTIPLIERS, resolveMembershipTierPrice } from './membershipPlans';

// Duplicado a mano de customer-app/lib/pricing.test.ts — mismo motivo que el
// propio pricing.ts: 3 líneas de matemática, no justifica un paquete
// compartido, pero sí necesita su propio test para no desincronizarse en
// silencio (esto calcula dinero real cobrado en mostrador).
describe('calculateMembershipPrice', () => {
  it('multiplies base price by tier factor and period multiplier', () => {
    expect(calculateMembershipPrice(1090, 1.0, 1)).toBe(1090);
  });

  it('rounds to the nearest 10', () => {
    expect(calculateMembershipPrice(1090, 1.5, 0.12)).toBe(200);
  });

  it('handles the annual multiplier', () => {
    expect(calculateMembershipPrice(890, 1.0, 9.5)).toBe(8460);
  });

  it('matches the price actually charged for a monthly single-gym signup at Roma Sur', () => {
    expect(calculateMembershipPrice(CURRENT_BRANCH_PRICE, TIER_FACTORS.single, PERIOD_MULTIPLIERS.monthly)).toBe(1090);
  });
});

// `all` stopped being branch.price × factor on 2026-09-15: one fixed price at
// any branch (TIER_BASE_PRICES), same rule as customer-core's
// resolveMembershipTierPrice. `single` keeps the old per-branch behavior.
describe('resolveMembershipTierPrice', () => {
  it('still derives single from branch price × factor', () => {
    expect(resolveMembershipTierPrice('single', CURRENT_BRANCH_PRICE, PERIOD_MULTIPLIERS.monthly)).toBe(1090);
  });

  it('charges the same fixed price for all, regardless of branch', () => {
    expect(resolveMembershipTierPrice('all', 890, PERIOD_MULTIPLIERS.monthly)).toBe(TIER_BASE_PRICES.all);
    expect(resolveMembershipTierPrice('all', 1390, PERIOD_MULTIPLIERS.monthly)).toBe(TIER_BASE_PRICES.all);
  });

  it('still applies the period multiplier on top of the fixed all price', () => {
    // 1550 (all, fixed) * 9.5 (annual) = 14725 -> rounds to 14730
    expect(resolveMembershipTierPrice('all', CURRENT_BRANCH_PRICE, PERIOD_MULTIPLIERS.annual)).toBe(14730);
  });
});
