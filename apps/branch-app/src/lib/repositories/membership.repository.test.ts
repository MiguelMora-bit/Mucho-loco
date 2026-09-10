import { describe, it, expect } from 'vitest';
import { membershipRepository } from './membership.repository';

describe('membershipRepository', () => {
  it('signUpNewMember mints a QR code that immediately validates as active', async () => {
    const payment = await membershipRepository.signUpNewMember(1, 'Roma Sur', {
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
    expect(found?.tierKey).toBe('single');
    expect(found?.homeBranchName).toBe('Roma Sur');
  });

  it('renewMembership reactivates an existing member and extends their expiry', async () => {
    const before = await membershipRepository.findMember('ML-QR-ANA02');
    expect(before?.status).toBe('grace');
    // Capture as a primitive — findMember returns a live reference to the
    // mock record (same convention as every other mock datasource here), so
    // `before` itself mutates once renewMembership runs.
    const expiresAtBefore = before?.expiresAt;

    const payment = await membershipRepository.renewMembership(1, 'Roma Sur', 'ML-QR-ANA02', 'single', 'monthly', 'transfer');
    expect(payment.isNewMember).toBe(false);
    expect(payment.paymentMethod).toBe('transfer');

    const after = await membershipRepository.findMember('ML-QR-ANA02');
    expect(after?.status).toBe('active');
    expect(after?.expiresAt).not.toBe(expiresAtBefore);
  });

  it('renewMembership rejects an unknown QR code', async () => {
    await expect(membershipRepository.renewMembership(1, 'Roma Sur', 'NOPE', 'single', 'monthly', 'cash')).rejects.toThrow();
  });

  it('signUpNewMember mints unpredictable QR codes, not a guessable sequence', async () => {
    // Regresión de la auditoría de seguridad 2026-09-10: antes eran
    // ML-QR-0100, 0101, 0102... — enumerables en segundos. Ahora deben tener
    // suficiente entropía y no seguir ningún patrón incremental obvio.
    const input = { memberName: 'Test', phone: '555', tierKey: 'single' as const, periodKey: 'monthly' as const, paymentMethod: 'cash' as const };
    const codes = await Promise.all([1, 2, 3].map(() => membershipRepository.signUpNewMember(1, 'Roma Sur', input).then((p) => p.qrCode)));

    const suffixes = codes.map((c) => c.replace('ML-QR-', ''));
    expect(new Set(suffixes).size).toBe(3); // sin colisiones
    for (const suffix of suffixes) {
      expect(suffix).toMatch(/^[0-9A-F]{12}$/); // hex de alta entropía, no un contador con padStart
    }
    // Un contador secuencial produciría diferencias de +1 entre valores
    // consecutivos interpretados como número — esto NO debe pasar con hex random.
    const asNumbers = suffixes.map((s) => parseInt(s, 16));
    expect(asNumbers[1] - asNumbers[0]).not.toBe(1);
    expect(asNumbers[2] - asNumbers[1]).not.toBe(1);
  });
});
