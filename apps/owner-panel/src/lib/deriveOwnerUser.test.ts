import { describe, it, expect } from 'vitest';
import { deriveOwnerUser } from './deriveOwnerUser';

describe('deriveOwnerUser', () => {
  it('returns the user when the token has the owner group', () => {
    const user = deriveOwnerUser({ email: 'rodrigo@mucholoco.mx', name: 'RODRIGO', groups: ['owner'] }, 'fallback@mucholoco.mx');
    expect(user).toEqual({ email: 'rodrigo@mucholoco.mx', name: 'RODRIGO' });
  });

  it('rejects a real account without the owner group — this is the whole security gate', () => {
    expect(deriveOwnerUser({ email: 'diego@mucholoco.mx', name: 'DIEGO', groups: [] }, 'diego@mucholoco.mx')).toBeNull();
    expect(deriveOwnerUser({ email: 'ana@mucholoco.mx', name: 'ANA', groups: ['manager'] }, 'ana@mucholoco.mx')).toBeNull();
  });

  it('falls back to the login-form email when the token has no email claim', () => {
    const user = deriveOwnerUser({ email: '', name: 'RODRIGO', groups: ['owner'] }, 'rodrigo@mucholoco.mx');
    expect(user?.email).toBe('rodrigo@mucholoco.mx');
  });
});
