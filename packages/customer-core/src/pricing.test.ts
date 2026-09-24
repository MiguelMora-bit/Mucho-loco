import { describe, it, expect } from 'vitest';
import { calculateMembershipPrice, formatMoney, formatPrice, resolveMembershipTierPrice } from './pricing';

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

describe('resolveMembershipTierPrice', () => {
  it('derives the price from branch price × factor when the tier has no basePrice', () => {
    // single tier: 1090 (Roma Sur) * 1.0 * 1 (monthly) = 1090
    expect(resolveMembershipTierPrice({ factor: 1.0 }, 1090, 1)).toBe(1090);
  });

  it('ignores branchPrice and factor when the tier has a fixed basePrice', () => {
    const all = { factor: 1.5, basePrice: 1550 };
    expect(resolveMembershipTierPrice(all, 890, 1)).toBe(1550);
    expect(resolveMembershipTierPrice(all, 1390, 1)).toBe(1550);
  });

  it('still applies the period multiplier on top of a fixed basePrice', () => {
    // 1550 (all, fixed) * 0.12 (visit) = 186 -> rounds to 190
    expect(resolveMembershipTierPrice({ factor: 1.5, basePrice: 1550 }, 1090, 0.12)).toBe(190);
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

describe('formatMoney', () => {
  // Un comprobante lleva centavos siempre; formatPrice (catálogo) no.
  it('always shows two decimals in pesos', () => {
    expect(formatMoney(1090, 'es')).toMatch(/1,090\.00/);
    expect(formatMoney(1090.5, 'en')).toMatch(/1,090\.50/);
    expect(formatMoney(0.99, 'es')).toMatch(/0\.99/);
  });

  it('says it is Mexican pesos in either language', () => {
    expect(formatMoney(1090, 'es')).toContain('$');
    expect(formatMoney(1090, 'en')).toMatch(/MX\$|MXN/);
  });
});
