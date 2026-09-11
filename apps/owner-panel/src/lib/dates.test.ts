import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDate, formatPeriodRange } from './dates';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('formatDate', () => {
  it('formats a date-only ISO string in Spanish', () => {
    expect(formatDate('2026-08-01', 'es')).toBe('01 ago 2026');
  });

  it('formats the same date in English', () => {
    expect(formatDate('2026-08-01', 'en')).toBe('Aug 01, 2026');
  });

  it('pins to UTC so a negative-offset timezone does not roll back to the previous day', () => {
    vi.stubEnv('TZ', 'America/Mexico_City');
    expect(formatDate('2026-01-01', 'es')).toBe('01 ene 2026');
  });
});

describe('formatPeriodRange', () => {
  // Note: Intl's formatRange drops the leading zero on the day and adds "de"
  // connectors in es-MX — a different rendering than formatDate's single-date
  // output for the same options object. That is upstream ICU behavior, not a
  // bug in this function; the exact strings below just pin it against drift.
  it('formats a payroll period as one locale-correct range in Spanish', () => {
    expect(formatPeriodRange('2026-08-01', '2026-08-15', 'es')).toBe('1–15 de ago de 2026');
  });

  it('formats the same range in English', () => {
    // ICU surrounds the en dash with U+2009 (thin space) here, not a regular space.
    expect(formatPeriodRange('2026-08-01', '2026-08-15', 'en')).toBe('Aug 1 – 15, 2026');
  });

  it('also pins the range to UTC', () => {
    vi.stubEnv('TZ', 'America/Mexico_City');
    expect(formatPeriodRange('2026-01-01', '2026-01-15', 'es')).toBe('1–15 de ene de 2026');
  });
});
