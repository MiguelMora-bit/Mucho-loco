import { describe, it, expect } from 'vitest';
import { evaluateAccess } from './evaluateAccess';
import { isAccessGranted } from './AccessMethod';
import type { MemberAccessRecord } from '@mucho-loco/types';

function record(overrides: Partial<MemberAccessRecord> = {}): MemberAccessRecord {
  return {
    qrCode: 'ML-QR-TEST',
    memberName: 'Test Member',
    status: 'active',
    expiresAt: '2030-01-01',
    tierKey: 'all',
    homeBranchId: 1,
    homeBranchName: 'Roma Sur',
    ...overrides,
  };
}

const ROMA_SUR = 1;
const CONDESA = 3;

describe('evaluateAccess', () => {
  it('returns not_found when there is no record, regardless of branch', () => {
    expect(evaluateAccess(undefined, ROMA_SUR)).toEqual({ outcome: 'not_found' });
  });

  it('allows an active all-gyms member at any branch', () => {
    const r = record({ tierKey: 'all', status: 'active' });
    expect(evaluateAccess(r, CONDESA)).toEqual({ outcome: 'valid', record: r });
  });

  it('allows a single-gym member at their home branch', () => {
    const r = record({ tierKey: 'single', homeBranchId: CONDESA, status: 'active' });
    expect(evaluateAccess(r, CONDESA)).toEqual({ outcome: 'valid', record: r });
  });

  it('rejects a single-gym member scanned at a different branch', () => {
    const r = record({ tierKey: 'single', homeBranchId: CONDESA, status: 'active' });
    expect(evaluateAccess(r, ROMA_SUR)).toEqual({ outcome: 'wrong_branch', record: r });
  });

  it('treats a grace-period member as valid (allowed, with a warning upstream)', () => {
    const r = record({ status: 'grace' });
    expect(evaluateAccess(r, ROMA_SUR)).toEqual({ outcome: 'valid', record: r });
  });

  it('denies an expired member', () => {
    const r = record({ status: 'expired' });
    expect(evaluateAccess(r, ROMA_SUR)).toEqual({ outcome: 'expired', record: r });
  });

  it('denies an expired member even at their own home branch (expired beats wrong_branch)', () => {
    const r = record({ status: 'expired', tierKey: 'single', homeBranchId: ROMA_SUR });
    expect(evaluateAccess(r, ROMA_SUR)).toEqual({ outcome: 'expired', record: r });
  });
});

describe('isAccessGranted', () => {
  it('is true only for the valid outcome', () => {
    expect(isAccessGranted({ outcome: 'valid', record: record() })).toBe(true);
    expect(isAccessGranted({ outcome: 'not_found' })).toBe(false);
    expect(isAccessGranted({ outcome: 'ambiguous', candidates: [] })).toBe(false);
    expect(isAccessGranted({ outcome: 'wrong_branch', record: record() })).toBe(false);
    expect(isAccessGranted({ outcome: 'expired', record: record() })).toBe(false);
  });
});
