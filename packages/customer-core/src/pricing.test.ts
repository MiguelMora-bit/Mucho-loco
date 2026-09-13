import { describe, it, expect } from 'vitest';
import { calculateMembershipPrice, formatPrice } from './pricing';

describe('calculateMembershipPrice', () => {
  it('multiplies base price by tier factor and period multiplier', () => {
    // 1090 (Roma Sur) * 1.0 (single) * 1 (monthly) = 1090, already a multiple of 10
    expect(calculateMembershipPrice(1090, 1.0, 1)).toBe(1090);
  });

  it('rounds to the nearest 10', () => {
    // 1090 * 1.5 (all-gyms tier) * 0.12 (visit period) = 196.2 -> rounds to 200
    expect(calculateMembershipPrice(1090, 1.5, 0.12)).toBe(200);
  });

  it('handles the annual multiplier', () => {
    // 890 * 1.0 * 9.5 = 8455 -> rounds to 8460
    expect(calculateMembershipPrice(890, 1.0, 9.5)).toBe(8460);
  });
});

describe('formatPrice', () => {
  it('prefixes with $ and groups thousands', () => {
    expect(formatPrice(1090)).toBe('$1,090');
  });

  it('handles amounts under 1000 with no separator', () => {
    expect(formatPrice(290)).toBe('$290');
  });
});
