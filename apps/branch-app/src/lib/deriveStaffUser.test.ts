import { describe, it, expect } from 'vitest';
import { deriveStaffUser, roleFromGroups } from './deriveStaffUser';

describe('roleFromGroups', () => {
  it('prefers manager over staff when a token somehow carries both', () => {
    expect(roleFromGroups(['staff', 'manager'])).toBe('manager');
  });

  it('returns staff for the staff group alone', () => {
    expect(roleFromGroups(['staff'])).toBe('staff');
  });

  it('returns null for a real account outside staff/manager (ej. cliente u owner)', () => {
    expect(roleFromGroups([])).toBeNull();
    expect(roleFromGroups(['owner'])).toBeNull();
  });
});

describe('deriveStaffUser', () => {
  it('derives role + branch for a known staff email', () => {
    const user = deriveStaffUser({ email: 'luis@mucholoco.mx', name: 'LUIS', groups: ['staff'] }, 'fallback');
    expect(user).toEqual({ email: 'luis@mucholoco.mx', name: 'LUIS', role: 'staff', branchId: 1, branchName: 'Roma Sur' });
  });

  it('derives role + branch for a known manager email', () => {
    const user = deriveStaffUser({ email: 'ana@mucholoco.mx', name: 'ANA', groups: ['manager'] }, 'fallback');
    expect(user?.role).toBe('manager');
    expect(user?.branchName).toBe('Roma Sur');
  });

  it('rejects a real account without staff/manager group', () => {
    expect(deriveStaffUser({ email: 'diego@mucholoco.mx', name: 'DIEGO', groups: [] }, 'diego@mucholoco.mx')).toBeNull();
    expect(deriveStaffUser({ email: 'rodrigo@mucholoco.mx', name: 'RODRIGO', groups: ['owner'] }, 'rodrigo@mucholoco.mx')).toBeNull();
  });

  it('rejects staff/manager accounts with no branch assigned in staffDirectory', () => {
    expect(deriveStaffUser({ email: 'nadie@mucholoco.mx', name: 'NADIE', groups: ['staff'] }, 'nadie@mucholoco.mx')).toBeNull();
  });
});
