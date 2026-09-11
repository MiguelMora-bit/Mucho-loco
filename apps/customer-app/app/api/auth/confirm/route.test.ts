import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
vi.mock('../../../../lib/cognito', () => ({
  cognitoClient: { send: (...args: unknown[]) => sendMock(...args) },
  COGNITO_CLIENT_ID: 'test-client-id',
}));

const verifyIdTokenMock = vi.fn();
vi.mock('../../../../lib/jwt', () => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) }));

const { POST } = await import('./route');

function req(body: unknown) {
  return new Request('http://localhost/api/auth/confirm', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  sendMock.mockReset();
  verifyIdTokenMock.mockReset();
});

describe('POST /api/auth/confirm', () => {
  it('returns 400 INVALID_INPUT when email or code is missing', async () => {
    const res = await POST(req({ email: 'diego@mucholoco.mx' }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('confirms without auto-login when no password is given', async () => {
    sendMock.mockResolvedValueOnce({}); // ConfirmSignUpCommand
    const res = await POST(req({ email: 'diego@mucholoco.mx', code: '123456' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledTimes(1); // never attempts InitiateAuth
    expect(res.cookies.get('ml_session')).toBeUndefined();
  });

  it('confirms and auto-logs in when a password is given', async () => {
    sendMock
      .mockResolvedValueOnce({}) // ConfirmSignUpCommand
      .mockResolvedValueOnce({ AuthenticationResult: { IdToken: 'id-tok', RefreshToken: 'refresh-tok' } }); // InitiateAuthCommand
    verifyIdTokenMock.mockResolvedValue({ email: 'diego@mucholoco.mx', name: 'Diego' });

    const res = await POST(req({ email: 'diego@mucholoco.mx', code: '123456', password: 'Bestia123!' }));

    expect(await res.json()).toEqual({ ok: true, user: { email: 'diego@mucholoco.mx', name: 'Diego' } });
    expect(res.cookies.get('ml_session')?.value).toBe('id-tok');
    expect(res.cookies.get('ml_refresh')?.value).toBe('refresh-tok');
  });

  it('confirms ok even if the auto-login step yields no tokens', async () => {
    sendMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ AuthenticationResult: {} });

    const res = await POST(req({ email: 'diego@mucholoco.mx', code: '123456', password: 'Bestia123!' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(res.cookies.get('ml_session')).toBeUndefined();
  });

  it('maps a wrong code to 400 CODE_MISMATCH', async () => {
    const err = new Error('bad code');
    err.name = 'CodeMismatchException';
    sendMock.mockRejectedValue(err);

    const res = await POST(req({ email: 'diego@mucholoco.mx', code: '000000' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'CODE_MISMATCH' });
  });
});
