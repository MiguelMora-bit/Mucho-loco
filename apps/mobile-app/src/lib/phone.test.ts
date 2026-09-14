import { describe, expect, it } from 'vitest';
import { toE164 } from './phone';

describe('toE164', () => {
  it('treats 10 digits as a Mexican number, whatever the formatting', () => {
    expect(toE164('55 1234 5678')).toBe('+525512345678');
    expect(toE164('(55) 1234-5678')).toBe('+525512345678');
  });

  it('accepts 52 + 10 digits without the plus', () => {
    expect(toE164('525512345678')).toBe('+525512345678');
  });

  it('keeps an explicit international number', () => {
    expect(toE164('+52 55 1234 5678')).toBe('+525512345678');
    expect(toE164('+1 415 555 0100')).toBe('+14155550100');
  });

  it('rejects what cannot be a phone', () => {
    expect(toE164('')).toBeNull();
    expect(toE164('12345')).toBeNull();
    expect(toE164('+12')).toBeNull();
  });
});
