import { describe, it, expect } from 'vitest';
import { QrAccessMethod } from './qrAccessMethod';

// Se instancia aquí: el singleton exportado ahora vive en index.ts y
// depende de VITE_DATA_SOURCE. Estos tests son del método MOCK.
const qrAccessMethod = new QrAccessMethod();

const ROMA_SUR = 1;
const CONDESA = 3;

describe('qrAccessMethod', () => {
  it('has the qr id', () => {
    expect(qrAccessMethod.id).toBe('qr');
  });

  it('allows an active all-gyms member at any branch', async () => {
    const result = await qrAccessMethod.checkAccess('ML-DIEGO-2026-ALLGYMS', ROMA_SUR);
    expect(result.outcome).toBe('valid');
  });

  it('rejects a single-gym member scanned at a different branch', async () => {
    const result = await qrAccessMethod.checkAccess('ML-VALERIA-2026-CONDESA', ROMA_SUR);
    expect(result.outcome).toBe('wrong_branch');
    if (result.outcome === 'wrong_branch') expect(result.record.homeBranchName).toBe('Condesa');
  });

  it('allows a single-gym member at their home branch', async () => {
    const result = await qrAccessMethod.checkAccess('ML-VALERIA-2026-CONDESA', CONDESA);
    expect(result.outcome).toBe('valid');
  });

  it('denies an expired member (regression 2026-09-11 — used to come back as valid)', async () => {
    const result = await qrAccessMethod.checkAccess('ML-QR-CARLOS03', ROMA_SUR);
    expect(result.outcome).toBe('expired');
  });

  it('returns not_found for an unknown code', async () => {
    const result = await qrAccessMethod.checkAccess('NOPE', ROMA_SUR);
    expect(result.outcome).toBe('not_found');
  });

  it('never matches a code against a record enrolled by fingerprint only', async () => {
    // Rosa no tiene qrCode público conocido por el socio, pero SÍ tiene un
    // qrCode interno — buscar por su fingerprintId acá (credential equivocado
    // para este método) no debe encontrar nada.
    const result = await qrAccessMethod.checkAccess('FP-DEMO-ROSA', ROMA_SUR);
    expect(result.outcome).toBe('not_found');
  });
});
