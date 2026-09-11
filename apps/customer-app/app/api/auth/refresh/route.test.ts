import { describe, it, expect, vi, beforeEach } from 'vitest';

const cookiesMock = vi.fn();
vi.mock('next/headers', () => ({ cookies: cookiesMock }));

const sendMock = vi.fn();
vi.mock('../../../../lib/cognito', () => ({
  cognitoClient: { send: (...args: unknown[]) => sendMock(...args) },
  COGNITO_CLIENT_ID: 'test-client-id',
}));

const verifyIdTokenMock = vi.fn();
vi.mock('../../../../lib/jwt', () => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) }));

const { POST } = await import('./route');

beforeEach(() => {
  sendMock.mockReset();
  verifyIdTokenMock.mockReset();
  cookiesMock.mockReset();
});

describe('POST /api/auth/refresh', () => {
  it('returns 401 SESSION_EXPIRED when there is no refresh cookie', async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined });
    const res = await POST();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'SESSION_EXPIRED' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('renews ml_session but does not rotate ml_refresh (REFRESH_TOKEN_AUTH returns no new refresh token)', async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'refresh-tok' }) });
    sendMock.mockResolvedValue({ AuthenticationResult: { IdToken: 'new-id-tok' } });
    verifyIdTokenMock.mockResolvedValue({ email: 'diego@mucholoco.mx', name: 'Diego' });

    const res = await POST();

    expect(await res.json()).toEqual({ ok: true, user: { email: 'diego@mucholoco.mx', name: 'Diego' } });
    expect(res.cookies.get('ml_session')?.value).toBe('new-id-tok');
    expect(res.cookies.get('ml_refresh')).toBeUndefined();
    expect(sendMock.mock.calls[0][0].input.AuthParameters).toEqual({ REFRESH_TOKEN: 'refresh-tok' });
  });

  it('clears cookies and returns 401 when Cognito yields no id token (revoked/expired refresh token)', async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'expired-refresh' }) });
    sendMock.mockResolvedValue({ AuthenticationResult: {} });

    const res = await POST();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'SESSION_EXPIRED' });
    expect(res.cookies.get('ml_session')?.value).toBeFalsy();
    expect(res.cookies.get('ml_refresh')?.value).toBeFalsy();
  });

  it('clears cookies on a Cognito error', async () => {
    cookiesMock.mockResolvedValue({ get: () => ({ value: 'refresh-tok' }) });
    const err = new Error('revoked');
    err.name = 'NotAuthorizedException';
    sendMock.mockRejectedValue(err);

    const res = await POST();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'WRONG_CREDENTIALS' });
    expect(res.cookies.get('ml_session')?.value).toBeFalsy();
  });
});
