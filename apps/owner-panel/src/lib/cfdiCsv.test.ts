import { describe, it, expect } from 'vitest';
import type { Cfdi } from '@mucho-loco/types';
import { cfdisToCsv } from './cfdiCsv';
import { currentMonth, inMonth, previousMonth } from './currentMonth';

const CFDI: Cfdi = {
  id: 'c1',
  uuid: 'UUID-1',
  kind: 'individual',
  status: 'valid',
  cancellationStatus: 'none',
  total: 1550.5,
  customerTaxId: 'CUPU800825569',
  customerLegalName: 'GIMNASIOS "LA BESTIA", SA',
  issuedAt: '2026-09-01T05:30:00.000Z', // 31 ago 23:30 en CDMX
};

describe('cfdisToCsv', () => {
  it('starts with a BOM and Spanish headers, one row per CFDI', () => {
    const csv = cfdisToCsv([CFDI], 'es');
    expect(csv.startsWith('﻿Folio fiscal,Tipo,')).toBe(true);
    expect(csv.trimEnd().split('\r\n')).toHaveLength(2);
  });

  it('escapes commas and quotes, and writes money with two decimals', () => {
    const row = cfdisToCsv([CFDI], 'es').trimEnd().split('\r\n')[1];
    expect(row).toContain('"GIMNASIOS ""LA BESTIA"", SA"');
    expect(row).toContain(',1550.50,');
  });

  it('dates are local to Mexico City', () => {
    expect(cfdisToCsv([CFDI], 'en')).toContain('2026-08-31 23:30');
  });
});

describe('currentMonth', () => {
  it('uses Mexico City time', () => {
    expect(currentMonth(new Date('2026-10-01T05:00:00.000Z'))).toBe('2026-09');
    expect(currentMonth(new Date('2026-10-01T07:00:00.000Z'))).toBe('2026-10');
  });

  it('knows the previous month and whether an instant falls in a month', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(inMonth('2026-09-01T05:30:00.000Z', '2026-08')).toBe(true);
  });
});
