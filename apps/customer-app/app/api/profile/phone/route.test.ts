import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentUserEmailMock = vi.fn();
vi.mock('../../../../lib/session', () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));

const updatePhoneMock = vi.fn();
vi.mock('../../../../lib/repositories/user.repository', () => ({
  userRepository: { updatePhone: (...args: unknown[]) => updatePhoneMock(...args) },
}));

const { PUT } = await import('./route');

function req(body: unknown) {
  return new Request('http://localhost/api/profile/phone', { method: 'PUT', body: JSON.stringify(body) });
}

beforeEach(() => {
  getCurrentUserEmailMock.mockReset();
  updatePhoneMock.mockReset();
});

describe('PUT /api/profile/phone (spec 015)', () => {
  it('rejects with 401 when there is no verified session', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null);
    const res = await PUT(req({ phone: '5512345678' }));
    expect(res.status).toBe(401);
    expect(updatePhoneMock).not.toHaveBeenCalled();
  });

  it('saves the phone in E.164 under the session email, never a client-supplied one', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    updatePhoneMock.mockResolvedValue({ email: 'diego@mucholoco.mx', phone: '+525512345678' });

    const res = await PUT(req({ phone: '55 1234 5678', email: 'otro@mucholoco.mx' }));

    expect(res.status).toBe(200);
    expect(updatePhoneMock).toHaveBeenCalledWith('diego@mucholoco.mx', '+525512345678');
    expect(await res.json()).toMatchObject({ phone: '+525512345678' });
  });

  it('answers 400 INVALID_PHONE for a phone that is not 10 digits, without calling the backend', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    for (const body of [{ phone: '55 12' }, { phone: 5512345678 }, null]) {
      const res = await PUT(req(body));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'INVALID_PHONE' });
    }
    expect(updatePhoneMock).not.toHaveBeenCalled();
  });
});
