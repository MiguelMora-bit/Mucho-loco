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

const VALID = { email: 'diego@mucholoco.mx', password: 'Bestia123!', phone: '55 1234 5678' };

beforeEach(() => {
  sendMock.mockReset();
});

describe('POST /api/auth/register', () => {
  it('returns 400 INVALID_INPUT when email or password is missing', async () => {
    const res = await POST(req({ email: 'diego@mucholoco.mx', phone: VALID.phone }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  // Spec 007: sin teléfono no llegan los avisos de WhatsApp.
  it.each([
    ['missing', undefined],
    ['too short', '123'],
    ['not a number', 'no tengo'],
  ])('returns 400 INVALID_PHONE when the phone is %s, without calling Cognito', async (_name, phone) => {
    const res = await POST(req({ ...VALID, phone }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'INVALID_PHONE' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('signs up with the given attributes, the phone in E.164 and the name when provided', async () => {
    sendMock.mockResolvedValue({});
    const res = await POST(req({ ...VALID, name: 'Diego' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const command = sendMock.mock.calls[0][0];
    expect(command.input).toEqual({
      ClientId: 'test-client-id',
      Username: 'diego@mucholoco.mx',
      Password: 'Bestia123!',
      UserAttributes: [
        { Name: 'email', Value: 'diego@mucholoco.mx' },
        { Name: 'phone_number', Value: '+525512345678' },
        { Name: 'name', Value: 'Diego' },
      ],
    });
  });

  it('omits the name attribute when no name is given', async () => {
    sendMock.mockResolvedValue({});
    await POST(req(VALID));
    const command = sendMock.mock.calls[0][0];
    expect(command.input.UserAttributes).toEqual([
      { Name: 'email', Value: 'diego@mucholoco.mx' },
      { Name: 'phone_number', Value: '+525512345678' },
    ]);
  });

  it('maps an existing account to 409 USER_EXISTS', async () => {
    const err = new Error('already exists');
    err.name = 'UsernameExistsException';
    sendMock.mockRejectedValue(err);

    const res = await POST(req(VALID));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'USER_EXISTS' });
  });
});
