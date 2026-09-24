import { describe, it, expect } from 'vitest';
import type { FiscalProfile } from '@mucho-loco/types';
import { invoicingRepository } from './invoicing.repository';

const email = `repo.${Date.now()}@test.mx`;

const PROFILE: FiscalProfile = {
  taxId: 'CUPU800825569',
  legalName: 'JUAN PÉREZ',
  taxSystem: '612',
  zip: '06700',
  cfdiUse: 'G03',
  email: null,
};

describe('invoicingRepository (mock, the default)', () => {
  it('starts without fiscal data', async () => {
    expect(await invoicingRepository.getFiscalProfile(email)).toBeNull();
  });

  it("lists the member's charges", async () => {
    expect(await invoicingRepository.getCharges(email)).toHaveLength(5);
  });

  it('saves the fiscal data and reads it back', async () => {
    await invoicingRepository.saveFiscalProfile(email, { ...PROFILE, taxId: 'cupu800825569' });
    expect(await invoicingRepository.getFiscalProfile(email)).toEqual(PROFILE);
  });
});
