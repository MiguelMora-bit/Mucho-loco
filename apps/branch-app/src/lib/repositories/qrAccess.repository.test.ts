import { describe, it, expect } from 'vitest';
import { qrAccessRepository } from './qrAccess.repository';

describe('qrAccessRepository', () => {
  it('validate finds an active member by QR code', async () => {
    const record = await qrAccessRepository.validate('ML-QR-DIEGO01');
    expect(record?.status).toBe('active');
  });

  it('validate finds a member in the grace period', async () => {
    const record = await qrAccessRepository.validate('ML-QR-ANA02');
    expect(record?.status).toBe('grace');
  });

  it('validate returns null for an unknown code', async () => {
    const record = await qrAccessRepository.validate('NOPE');
    expect(record).toBeNull();
  });
});
