import { describe, it, expect } from 'vitest';
import { formatDate } from './dates';

describe('formatDate', () => {
  it('formats a date-only ISO string in Spanish', () => {
    expect(formatDate('2026-06-19', 'es')).toBe('19 jun 2026');
  });

  it('formats the same date in English', () => {
    expect(formatDate('2026-06-19', 'en')).toBe('Jun 19, 2026');
  });

  it('pins to UTC so a negative-offset timezone does not roll back to the previous day', () => {
    // Regression guard for the exact bug documented in dates.ts: without
    // timeZone: 'UTC', a date-only string parses as UTC midnight, and any
    // timezone west of UTC (all of Mexico) would print one day earlier.
    const originalTz = process.env.TZ;
    process.env.TZ = 'America/Mexico_City';
    try {
      expect(formatDate('2026-01-01', 'es')).toBe('01 ene 2026');
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it('respects custom Intl.DateTimeFormat options', () => {
    expect(formatDate('2026-06-19', 'en', { year: 'numeric' })).toBe('2026');
  });
});
