import { describe, expect, it } from 'vitest';
import { translations } from '@mucho-loco/customer-core/translations';
import { mobileMessages } from '../mobile-messages';
import { authErrorCode, authErrorMessage } from './errors';
import { needsRefresh } from './expiry';
import { decodeJwtPayload } from './jwt';
import { MOCK_CONFIRMATION_CODE, MockAuthService } from './mock';
import { AuthError } from './types';

describe('MockAuthService', () => {
  const auth = new MockAuthService();

  it('signs in any well-formed email with an 8+ char password, normalized, with an expiry', async () => {
    const session = await auth.signIn('  Diego@MuchoLoco.mx ', 'Bestia123!');
    expect(session.email).toBe('diego@mucholoco.mx');
    expect(session.idToken).toBeTruthy();
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejects a short password the same way Cognito would', async () => {
    await expect(auth.signIn('diego@mucholoco.mx', 'corta')).rejects.toMatchObject({ code: 'WRONG_CREDENTIALS' });
  });

  it('rejects a malformed email', async () => {
    await expect(auth.signIn('diego', 'Bestia123!')).rejects.toBeInstanceOf(AuthError);
  });

  it('signs up with the User Pool password policy and a valid phone', async () => {
    const ok = { name: 'Nueva Bestia', email: 'nueva@mucholoco.mx', password: 'Bestia123!', phone: '55 1234 5678' };
    await expect(auth.signUp(ok)).resolves.toBeUndefined();
    await expect(auth.signUp({ ...ok, password: 'todominuscula1' })).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
    await expect(auth.signUp({ ...ok, phone: '123' })).rejects.toMatchObject({ code: 'INVALID_PHONE' });
    await expect(auth.signUp({ ...ok, email: 'diego@mucholoco.mx' })).rejects.toMatchObject({ code: 'USER_EXISTS' });
  });

  it('confirms only with the demo code', async () => {
    await expect(auth.confirmSignUp('nueva@mucholoco.mx', MOCK_CONFIRMATION_CODE)).resolves.toBeUndefined();
    await expect(auth.confirmSignUp('nueva@mucholoco.mx', '000000')).rejects.toMatchObject({ code: 'CODE_MISMATCH' });
  });

  it('offers no social login', () => {
    expect(auth.socialProviders).toEqual([]);
  });
});

describe('authErrorMessage', () => {
  const t = translations.es;
  const m = mobileMessages.es;

  it('uses the same account.errors keys as the web', () => {
    expect(authErrorMessage('WRONG_CREDENTIALS', t, m)).toBe(t.account.errors.wrongCredentials);
    expect(authErrorMessage('SOCIAL_LOGIN_FAILED', t, m)).toBe(t.account.errors.socialLoginFailed);
    expect(authErrorMessage('INVALID_PHONE', t, m)).toBe(m.auth.invalidPhone);
  });

  it('falls back to the generic login error for anything that is not ours', () => {
    expect(authErrorMessage(authErrorCode(new TypeError('Network request failed')), t, m)).toBe(t.account.errorLogin);
  });
});

describe('needsRefresh', () => {
  const now = Date.parse('2026-09-12T12:00:00Z');

  it('refreshes inside the 5 minute margin, not before', () => {
    expect(needsRefresh({ expiresAt: now + 30 * 60_000 }, now)).toBe(false);
    expect(needsRefresh({ expiresAt: now + 4 * 60_000 }, now)).toBe(true);
    expect(needsRefresh({ expiresAt: now - 1 }, now)).toBe(true);
  });

  it('treats a session without expiry (older app version) as expired', () => {
    expect(needsRefresh({ expiresAt: 0 }, now)).toBe(true);
  });
});

/** base64url de un JSON en UTF-8, con APIs que también existen en Hermes (no `Buffer`). */
function base64url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('decodeJwtPayload', () => {
  it('reads UTF-8 claims (accents) from a base64url payload', () => {
    const payload = base64url({ name: 'Diego Ramírez', exp: 123 });
    expect(decodeJwtPayload(`header.${payload}.sig`)).toEqual({ name: 'Diego Ramírez', exp: 123 });
  });

  it('rejects something that is not a JWT', () => {
    expect(() => decodeJwtPayload('nope')).toThrow();
  });
});
