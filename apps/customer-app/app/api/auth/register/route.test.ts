import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
vi.mock('../../../../lib/cognito', () => ({
  cognitoClient: { send: (...args: unknown[]) => sendMock(...args) },
  COGNITO_CLIENT_ID: 'test-client-id',
}));

const { POST } = await import('./route');

function req(body: unknown) {
  return new Request('http://localhost/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  sendMock.mockReset();
});

describe('POST /api/auth/register', () => {
  it('returns 400 INVALID_INPUT when email or password is missing', async () => {
    const res = await POST(req({ email: 'diego@mucholoco.mx' }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('signs up with the given attributes, including name when provided', async () => {
    sendMock.mockResolvedValue({});
    const res = await POST(req({ email: 'diego@mucholoco.mx', password: 'Bestia123!', name: 'Diego' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const command = sendMock.mock.calls[0][0];
    expect(command.input).toEqual({
      ClientId: 'test-client-id',
      Username: 'diego@mucholoco.mx',
      Password: 'Bestia123!',
      UserAttributes: [
        { Name: 'email', Value: 'diego@mucholoco.mx' },
        { Name: 'name', Value: 'Diego' },
      ],
    });
  });

  it('omits the name attribute when no name is given', async () => {
    sendMock.mockResolvedValue({});
    await POST(req({ email: 'diego@mucholoco.mx', password: 'Bestia123!' }));
    const command = sendMock.mock.calls[0][0];
    expect(command.input.UserAttributes).toEqual([{ Name: 'email', Value: 'diego@mucholoco.mx' }]);
  });

  it('maps an existing account to 409 USER_EXISTS', async () => {
    const err = new Error('already exists');
    err.name = 'UsernameExistsException';
    sendMock.mockRejectedValue(err);

    const res = await POST(req({ email: 'diego@mucholoco.mx', password: 'Bestia123!' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'USER_EXISTS' });
  });
});
