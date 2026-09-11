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
  return new Request('http://localhost/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  sendMock.mockReset();
  verifyIdTokenMock.mockReset();
});

describe('POST /api/auth/login', () => {
  it('returns 400 INVALID_INPUT when email or password is missing', async () => {
    const res = await POST(req({ email: 'diego@mucholoco.mx' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'INVALID_INPUT' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('on success, sets ml_session/ml_refresh and returns the verified user', async () => {
    sendMock.mockResolvedValue({ AuthenticationResult: { IdToken: 'id-tok', RefreshToken: 'refresh-tok' } });
    verifyIdTokenMock.mockResolvedValue({ email: 'diego@mucholoco.mx', name: 'Diego' });

    const res = await POST(req({ email: 'diego@mucholoco.mx', password: 'Bestia123!' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, user: { email: 'diego@mucholoco.mx', name: 'Diego' } });
    expect(res.cookies.get('ml_session')?.value).toBe('id-tok');
    expect(res.cookies.get('ml_session')?.httpOnly).toBe(true);
    expect(res.cookies.get('ml_refresh')?.value).toBe('refresh-tok');
  });

  it('falls back to the submitted email when the token has no email claim', async () => {
    sendMock.mockResolvedValue({ AuthenticationResult: { IdToken: 'id-tok', RefreshToken: 'refresh-tok' } });
    verifyIdTokenMock.mockResolvedValue({ email: '', name: 'Diego' });

    const res = await POST(req({ email: 'diego@mucholoco.mx', password: 'Bestia123!' }));
    expect((await res.json()).user.email).toBe('diego@mucholoco.mx');
  });

  it('returns 500 UNKNOWN when Cognito does not return tokens', async () => {
    sendMock.mockResolvedValue({ AuthenticationResult: {} });
    const res = await POST(req({ email: 'diego@mucholoco.mx', password: 'x' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'UNKNOWN' });
  });

  it('maps wrong credentials to 401 WRONG_CREDENTIALS without leaking the raw AWS error', async () => {
    const err = new Error('Incorrect username or password.');
    err.name = 'NotAuthorizedException';
    sendMock.mockRejectedValue(err);

    const res = await POST(req({ email: 'diego@mucholoco.mx', password: 'wrong' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'WRONG_CREDENTIALS' });
  });
});
