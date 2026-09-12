import { describe, it, expect } from 'vitest';
import { qrAccessRepository } from './qrAccess.repository';

const ROMA_SUR = 1;
const INTERLOMAS = 4;
const CONDESA = 3;

describe('qrAccessRepository', () => {
  it('validate allows an active all-gyms member at any branch', async () => {
    const result = await qrAccessRepository.validate('ML-DIEGO-2026-ALLGYMS', ROMA_SUR);
    expect(result.outcome).toBe('valid');
    if (result.outcome === 'valid') expect(result.record.status).toBe('active');
  });

  it('validate allows a single-gym member at their home branch', async () => {
    const result = await qrAccessRepository.validate('ML-VALERIA-2026-CONDESA', CONDESA);
    expect(result.outcome).toBe('valid');
  });

  it('validate rejects a single-gym member scanned at a different branch', async () => {
    const result = await qrAccessRepository.validate('ML-VALERIA-2026-CONDESA', ROMA_SUR);
    expect(result.outcome).toBe('wrong_branch');
    if (result.outcome === 'wrong_branch') expect(result.record.homeBranchName).toBe('Condesa');
  });

  it('validate finds a member in the grace period', async () => {
    const result = await qrAccessRepository.validate('ML-QR-ANA02', ROMA_SUR);
    expect(result.outcome).toBe('valid');
    if (result.outcome === 'valid') expect(result.record.status).toBe('grace');
  });

  it('validate returns not_found for an unknown code', async () => {
    const result = await qrAccessRepository.validate('NOPE', ROMA_SUR);
    expect(result.outcome).toBe('not_found');
  });

  it('validate denies an expired member (fixed 2026-09-11 — used to come back as "valid")', async () => {
    const result = await qrAccessRepository.validate('ML-QR-CARLOS03', ROMA_SUR);
    expect(result.outcome).toBe('expired');
    if (result.outcome === 'expired') expect(result.record.memberName).toBe('Carlos Mendoza');
  });

  it('validate denies an expired member even at their own home branch (expired beats wrong_branch)', async () => {
    const result = await qrAccessRepository.validate('ML-QR-CARLOS03', 1); // Carlos' own homeBranchId
    expect(result.outcome).toBe('expired');
  });

  // Socios dados de alta con huella en vez de QR (sin la app) — ver
  // CLAUDE.md raíz, "Métodos de acceso". Mismas reglas de tier/sucursal que
  // validate(), solo cambia el campo por el que se busca al socio.
  describe('validateByFingerprint', () => {
    it('allows an active all-gyms member enrolled by fingerprint at any branch', async () => {
      const result = await qrAccessRepository.validateByFingerprint('FP-DEMO-ROSA', CONDESA);
      expect(result.outcome).toBe('valid');
      if (result.outcome === 'valid') expect(result.record.memberName).toBe('Rosa Jiménez');
    });

    it('allows a single-gym fingerprint member at their home branch', async () => {
      const result = await qrAccessRepository.validateByFingerprint('FP-DEMO-LUIS', INTERLOMAS);
      expect(result.outcome).toBe('valid');
    });

    it('rejects a single-gym fingerprint member scanned at a different branch', async () => {
      const result = await qrAccessRepository.validateByFingerprint('FP-DEMO-LUIS', ROMA_SUR);
      expect(result.outcome).toBe('wrong_branch');
      if (result.outcome === 'wrong_branch') expect(result.record.homeBranchName).toBe('Interlomas');
    });

    it('returns not_found for an unknown fingerprint id', async () => {
      const result = await qrAccessRepository.validateByFingerprint('FP-NOPE', ROMA_SUR);
      expect(result.outcome).toBe('not_found');
    });

    it('never matches a fingerprint id against a record enrolled by QR only', async () => {
      // ML-DIEGO-2026-ALLGYMS no tiene fingerprintId — buscarlo como huella no debe encontrar nada.
      const result = await qrAccessRepository.validateByFingerprint('ML-DIEGO-2026-ALLGYMS', ROMA_SUR);
      expect(result.outcome).toBe('not_found');
    });
  });
});
