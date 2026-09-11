import { describe, it, expect, beforeEach } from 'vitest';
import { getCurrentBranchId, getCurrentBranchName } from './currentBranch';
import { useAuthStore } from './stores/auth.store';

const STAFF_USER = { email: 'luis@mucholoco.mx', name: 'Luis', role: 'staff' as const, branchId: 1, branchName: 'Roma Sur' };

beforeEach(() => {
  useAuthStore.getState().clear();
});

describe('getCurrentBranchId / getCurrentBranchName', () => {
  it('throws when called without an active staff session (every call site sits behind ProtectedRoute)', () => {
    expect(() => getCurrentBranchId()).toThrow('sin sesión de staff activa');
    expect(() => getCurrentBranchName()).toThrow('sin sesión de staff activa');
  });

  it('returns the branch of the logged-in staff user', () => {
    useAuthStore.getState().setSession({ user: STAFF_USER, idToken: 'id', refreshToken: 'refresh', idTokenExp: 0 });
    expect(getCurrentBranchId()).toBe(1);
    expect(getCurrentBranchName()).toBe('Roma Sur');
  });

  it('throws again once the session is cleared (logout)', () => {
    useAuthStore.getState().setSession({ user: STAFF_USER, idToken: 'id', refreshToken: 'refresh', idTokenExp: 0 });
    useAuthStore.getState().clear();
    expect(() => getCurrentBranchId()).toThrow();
  });
});
