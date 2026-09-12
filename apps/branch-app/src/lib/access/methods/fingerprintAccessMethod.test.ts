import { describe, it, expect } from 'vitest';
import { fingerprintAccessMethod } from './fingerprintAccessMethod';

const ROMA_SUR = 1;
const INTERLOMAS = 4;

describe('fingerprintAccessMethod', () => {
  it('has the fingerprint id', () => {
    expect(fingerprintAccessMethod.id).toBe('fingerprint');
  });

  it('allows an active all-gyms member enrolled by fingerprint at any branch', async () => {
    const result = await fingerprintAccessMethod.checkAccess('FP-DEMO-ROSA', INTERLOMAS);
    expect(result.outcome).toBe('valid');
    if (result.outcome === 'valid') expect(result.record.memberName).toBe('Rosa Jiménez');
  });

  it('allows a single-gym fingerprint member at their home branch', async () => {
    const result = await fingerprintAccessMethod.checkAccess('FP-DEMO-LUIS', INTERLOMAS);
    expect(result.outcome).toBe('valid');
  });

  it('rejects a single-gym fingerprint member scanned at a different branch', async () => {
    const result = await fingerprintAccessMethod.checkAccess('FP-DEMO-LUIS', ROMA_SUR);
    expect(result.outcome).toBe('wrong_branch');
    if (result.outcome === 'wrong_branch') expect(result.record.homeBranchName).toBe('Interlomas');
  });

  it('returns not_found for an unknown fingerprint id', async () => {
    const result = await fingerprintAccessMethod.checkAccess('FP-NOPE', ROMA_SUR);
    expect(result.outcome).toBe('not_found');
  });

  it('never matches a fingerprint id against a record enrolled by QR only', async () => {
    const result = await fingerprintAccessMethod.checkAccess('ML-DIEGO-2026-ALLGYMS', ROMA_SUR);
    expect(result.outcome).toBe('not_found');
  });
});
