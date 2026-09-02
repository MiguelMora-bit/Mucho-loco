import { describe, it, expect } from 'vitest';
import { membershipRepository } from './membership.repository';

describe('membershipRepository', () => {
  it('signUpNewMember mints a QR code that immediately validates as active', async () => {
    const payment = await membershipRepository.signUpNewMember(1, {
      memberName: 'Test Member',
      phone: '5555555555',
      tierKey: 'single',
      periodKey: 'monthly',
      paymentMethod: 'cash',
    });
    expect(payment.isNewMember).toBe(true);
    expect(payment.amount).toBeGreaterThan(0);

    const found = await membershipRepository.findMember(payment.qrCode);
    expect(found?.status).toBe('active');
    expect(found?.memberName).toBe('Test Member');
  });

  it('renewMembership reactivates an existing member and extends their expiry', async () => {
    const before = await membershipRepository.findMember('ML-QR-ANA02');
    expect(before?.status).toBe('grace');
    // Capture as a primitive — findMember returns a live reference to the
    // mock record (same convention as every other mock datasource here), so
    // `before` itself mutates once renewMembership runs.
    const expiresAtBefore = before?.expiresAt;

    const payment = await membershipRepository.renewMembership(1, 'ML-QR-ANA02', 'single', 'monthly', 'transfer');
    expect(payment.isNewMember).toBe(false);
    expect(payment.paymentMethod).toBe('transfer');

    const after = await membershipRepository.findMember('ML-QR-ANA02');
    expect(after?.status).toBe('active');
    expect(after?.expiresAt).not.toBe(expiresAtBefore);
  });

  it('renewMembership rejects an unknown QR code', async () => {
    await expect(membershipRepository.renewMembership(1, 'NOPE', 'single', 'monthly', 'cash')).rejects.toThrow();
  });
});
