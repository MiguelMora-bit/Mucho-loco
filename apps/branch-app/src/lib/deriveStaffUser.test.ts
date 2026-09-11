import { describe, it, expect } from 'vitest';
import { roleFromGroups, deriveStaffUser } from './deriveStaffUser';

describe('roleFromGroups', () => {
  it('returns null for a customer (no staff/manager group)', () => {
    expect(roleFromGroups([])).toBeNull();
  });

  it('returns staff for the staff group', () => {
    expect(roleFromGroups(['staff'])).toBe('staff');
  });

  it('returns manager for the manager group', () => {
    expect(roleFromGroups(['manager'])).toBe('manager');
  });

  it('prefers manager when a user is somehow in both groups', () => {
    expect(roleFromGroups(['staff', 'manager'])).toBe('manager');
  });

  it('ignores unrelated groups (e.g. owner, which is a different app)', () => {
    expect(roleFromGroups(['owner'])).toBeNull();
  });
});

describe('deriveStaffUser', () => {
  it('returns null when the verified claims carry no staff/manager group', () => {
    const result = deriveStaffUser({ email: 'diego@mucholoco.mx', name: 'Diego', groups: [] }, 'diego@mucholoco.mx');
    expect(result).toBeNull();
  });

  it('returns null when the role is valid but the email has no branch assignment', () => {
    // ana@/luis@ are in staffDirectory (Roma Sur) — an unlisted email must not default to some branch.
    const result = deriveStaffUser({ email: 'nadie@mucholoco.mx', name: 'Nadie', groups: ['staff'] }, 'nadie@mucholoco.mx');
    expect(result).toBeNull();
  });

  it('builds a StaffUser for a known staff email', () => {
    const result = deriveStaffUser({ email: 'luis@mucholoco.mx', name: 'Luis', groups: ['staff'] }, 'luis@mucholoco.mx');
    expect(result).toEqual({ email: 'luis@mucholoco.mx', name: 'Luis', role: 'staff', branchId: 1, branchName: 'Roma Sur' });
  });

  it('builds a StaffUser for a known manager email', () => {
    const result = deriveStaffUser({ email: 'ana@mucholoco.mx', name: 'Ana', groups: ['manager'] }, 'ana@mucholoco.mx');
    expect(result?.role).toBe('manager');
  });

  it('falls back to the given email when the claims carry no email (never trusts an empty identity)', () => {
    const result = deriveStaffUser({ email: '', name: 'Luis', groups: ['staff'] }, 'luis@mucholoco.mx');
    expect(result?.email).toBe('luis@mucholoco.mx');
  });
});
