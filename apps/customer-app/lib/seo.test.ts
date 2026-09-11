import { describe, it, expect } from 'vitest';
import { localizedUrl, SITE_URL } from './seo';

describe('localizedUrl', () => {
  it('builds the Spanish URL with no locale prefix', () => {
    expect(localizedUrl('/product/p1', 'es')).toBe(`${SITE_URL}/product/p1`);
  });

  it('prefixes English with /en', () => {
    expect(localizedUrl('/product/p1', 'en')).toBe(`${SITE_URL}/en/product/p1`);
  });

  it('handles the root path without a double slash', () => {
    expect(localizedUrl('/', 'es')).toBe(SITE_URL);
    expect(localizedUrl('/', 'en')).toBe(`${SITE_URL}/en`);
  });
});
