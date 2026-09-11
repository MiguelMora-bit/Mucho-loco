import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const cookiesMock = vi.fn();
vi.mock('next/headers', () => ({ cookies: cookiesMock }));

const verifyIdTokenMock = vi.fn();
vi.mock('./jwt', () => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) }));

const { setSessionCookie, setSessionCookies, clearSessionCookies, getCurrentUserEmail } = await import('./session');

beforeEach(() => {
  cookiesMock.mockReset();
  verifyIdTokenMock.mockReset();
});

describe('setSessionCookie / setSessionCookies', () => {
  it('sets ml_session as httpOnly with the id token', () => {
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, 'id-token-value');
    const cookie = response.cookies.get('ml_session');
    expect(cookie?.value).toBe('id-token-value');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
  });

  it('sets both ml_session and ml_refresh', () => {
    const response = NextResponse.json({ ok: true });
    setSessionCookies(response, { idToken: 'id-tok', refreshToken: 'refresh-tok' });
    expect(response.cookies.get('ml_session')?.value).toBe('id-tok');
    expect(response.cookies.get('ml_refresh')?.value).toBe('refresh-tok');
  });
});

describe('clearSessionCookies', () => {
  it('removes both session cookies', () => {
    const response = NextResponse.json({ ok: true });
    setSessionCookies(response, { idToken: 'id-tok', refreshToken: 'refresh-tok' });
    clearSessionCookies(response);
    // Next marks a deleted cookie with maxAge 0 / empty value rather than removing the header entirely.
    expect(response.cookies.get('ml_session')?.value).toBeFalsy();
    expect(response.cookies.get('ml_refresh')?.value).toBeFalsy();
  });
});

describe('getCurrentUserEmail', () => {
  it('returns null when there is no session cookie', async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    expect(await getCurrentUserEmail()).toBeNull();
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it('returns the verified email when the cookie holds a valid token', async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'a-jwt' }) });
    verifyIdTokenMock.mockResolvedValue({ email: 'diego@mucholoco.mx', name: 'Diego' });
    expect(await getCurrentUserEmail()).toBe('diego@mucholoco.mx');
  });

  it('returns null when the cookie fails signature/expiry verification (forged/expired token)', async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'tampered-jwt' }) });
    verifyIdTokenMock.mockRejectedValue(new Error('signature verification failed'));
    expect(await getCurrentUserEmail()).toBeNull();
  });
});
