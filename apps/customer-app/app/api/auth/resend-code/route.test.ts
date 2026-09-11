import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
vi.mock('../../../../lib/cognito', () => ({
  cognitoClient: { send: (...args: unknown[]) => sendMock(...args) },
  COGNITO_CLIENT_ID: 'test-client-id',
}));

const { POST } = await import('./route');

function req(body: unknown) {
  return new Request('http://localhost/api/auth/resend-code', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  sendMock.mockReset();
});

describe('POST /api/auth/resend-code', () => {
  it('returns 400 INVALID_INPUT when email is missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('resends the code for the given email', async () => {
    sendMock.mockResolvedValue({});
    const res = await POST(req({ email: 'diego@mucholoco.mx' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendMock.mock.calls[0][0].input).toEqual({ ClientId: 'test-client-id', Username: 'diego@mucholoco.mx' });
  });

  it('maps too many attempts to 429', async () => {
    const err = new Error('slow down');
    err.name = 'TooManyRequestsException';
    sendMock.mockRejectedValue(err);
    const res = await POST(req({ email: 'diego@mucholoco.mx' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'TOO_MANY_ATTEMPTS' });
  });
});
