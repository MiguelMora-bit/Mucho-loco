import { describe, it, expect } from 'vitest';
import { localizedHref } from './i18n-href';

describe('localizedHref', () => {
  it('leaves hash anchors untouched regardless of locale', () => {
    expect(localizedHref('#contact', 'es')).toBe('#contact');
    expect(localizedHref('#contact', 'en')).toBe('#contact');
  });

  it('leaves Spanish (default locale) paths unprefixed', () => {
    expect(localizedHref('/product/p7', 'es')).toBe('/product/p7');
  });

  it('prefixes English paths with /en', () => {
    expect(localizedHref('/product/p7', 'en')).toBe('/en/product/p7');
  });
});
