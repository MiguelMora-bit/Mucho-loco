import { describe, it, expect } from 'vitest';
import { calculateMembershipPrice } from './pricing';
import { CURRENT_BRANCH_PRICE, TIER_FACTORS, PERIOD_MULTIPLIERS } from './membershipPlans';

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

  it('matches the price actually charged for an annual all-gyms signup at Roma Sur', () => {
    expect(calculateMembershipPrice(CURRENT_BRANCH_PRICE, TIER_FACTORS.all, PERIOD_MULTIPLIERS.annual)).toBe(15530);
  });
});
