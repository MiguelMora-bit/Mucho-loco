import { describe, expect, it } from 'vitest';
import type { FiscalProfile } from '@mucho-loco/types';
import {
  CFDI_USES,
  TAX_SYSTEMS,
  allowedCfdiUses,
  isRfcShape,
  isZipShape,
  normalizeFiscalText,
  validateFiscalProfile,
} from './fiscal';

const BUSINESS = ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626'];
const S01_ONLY = ['605', '607', '608', '610', '611', '614', '615', '616'];

const VALID: FiscalProfile = {
  taxId: 'CUPU800825569',
  legalName: 'JUAN PÉREZ',
  taxSystem: '612',
  zip: '06700',
  cfdiUse: 'G03',
  email: null,
};

describe('catálogo fiscal', () => {
  it('lists exactly the 19 receiver tax systems the backend accepts', () => {
    expect(TAX_SYSTEMS.map((t) => t.key).sort()).toEqual([...BUSINESS, ...S01_ONLY].sort());
  });

  it('names every tax system and CFDI use in both languages', () => {
    for (const item of [...TAX_SYSTEMS, ...CFDI_USES]) {
      expect(item.name.es).toBeTruthy();
      expect(item.name.en).toBeTruthy();
    }
    expect(CFDI_USES.map((u) => u.key)).toEqual(['G01', 'G03', 'S01']);
  });

  // c_UsoCFDI del SAT: G01/G03 son deducciones de quien tiene actividad
  // empresarial; un asalariado (605) o quien no tiene obligaciones (616)
  // solo puede pedir "sin efectos fiscales".
  it.each(BUSINESS)('%s may use G01, G03 or S01', (key) => {
    expect(allowedCfdiUses(key)).toEqual(['G01', 'G03', 'S01']);
  });

  it.each(S01_ONLY)('%s may only use S01', (key) => {
    expect(allowedCfdiUses(key)).toEqual(['S01']);
  });

  it('an unknown tax system allows nothing', () => {
    expect(allowedCfdiUses('999')).toEqual([]);
    expect(allowedCfdiUses('')).toEqual([]);
  });
});

describe('normalizeFiscalText', () => {
  it('uppercases and trims, the way the constancia writes it', () => {
    expect(normalizeFiscalText('  xaxx010101000 ')).toBe('XAXX010101000');
    expect(normalizeFiscalText('  juan   pérez ')).toBe('JUAN PÉREZ');
  });
});

describe('shapes', () => {
  it('accepts a 13-character (persona física) and a 12-character (moral) RFC', () => {
    expect(isRfcShape('CUPU800825569')).toBe(true);
    expect(isRfcShape('ABC680524P76')).toBe(true);
    expect(isRfcShape('ÑAÑ&010101AB1')).toBe(true);
  });

  it('rejects what is not an RFC', () => {
    expect(isRfcShape('ABCD')).toBe(false);
    expect(isRfcShape('cupu800825569')).toBe(false);
    expect(isRfcShape('CUPU80082556')).toBe(false);
  });

  it('a zip code is exactly 5 digits', () => {
    expect(isZipShape('06700')).toBe(true);
    expect(isZipShape('123')).toBe(false);
    expect(isZipShape('0670a')).toBe(false);
  });
});

describe('validateFiscalProfile', () => {
  it('a valid profile has no errors', () => {
    expect(validateFiscalProfile(VALID)).toEqual({});
  });

  it('validates after normalizing, so lowercase input is fine', () => {
    expect(validateFiscalProfile({ ...VALID, taxId: ' cupu800825569 ' })).toEqual({});
  });

  it('reports every bad field at once', () => {
    expect(
      validateFiscalProfile({
        taxId: 'abcd',
        legalName: '  ',
        taxSystem: '999',
        zip: '123',
        cfdiUse: 'G01',
        email: 'no-es-correo',
      }),
    ).toEqual({
      taxId: true,
      legalName: true,
      taxSystem: true,
      zip: true,
      cfdiUse: true,
      email: true,
    });
  });

  it('rejects a legal name longer than 254 characters', () => {
    expect(validateFiscalProfile({ ...VALID, legalName: 'A'.repeat(255) })).toEqual({ legalName: true });
  });

  it('rejects a CFDI use the tax system does not allow', () => {
    expect(validateFiscalProfile({ ...VALID, taxSystem: '605', cfdiUse: 'G01' })).toEqual({ cfdiUse: true });
  });

  it('an empty email means "use the account email", not an error', () => {
    expect(validateFiscalProfile({ ...VALID, email: null })).toEqual({});
    expect(validateFiscalProfile({ ...VALID, email: '' })).toEqual({});
  });
});
