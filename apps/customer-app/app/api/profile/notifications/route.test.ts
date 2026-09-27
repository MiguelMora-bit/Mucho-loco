import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentUserEmailMock = vi.fn();
vi.mock('../../../../lib/session', () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));

const updateMock = vi.fn();
vi.mock('../../../../lib/repositories/user.repository', () => ({
  userRepository: { updateNotificationPreferences: (...args: unknown[]) => updateMock(...args) },
}));

const { PUT } = await import('./route');

function req(body: unknown) {
  return new Request('http://localhost/api/profile/notifications', { method: 'PUT', body: JSON.stringify(body) });
}

beforeEach(() => {
  getCurrentUserEmailMock.mockReset();
  updateMock.mockReset();
});

describe('PUT /api/profile/notifications (spec 053)', () => {
  it('rejects with 401 when there is no verified session', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null);
    const res = await PUT(req({ membership: true, orders: true, payments: true }));
    expect(res.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('saves the three categories under the session email, and nothing else', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    updateMock.mockResolvedValue({ membership: true, orders: false, payments: true });

    const res = await PUT(req({ membership: true, orders: false, payments: true, email: 'otro@mucholoco.mx' }));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('diego@mucholoco.mx', { membership: true, orders: false, payments: true });
    expect(await res.json()).toEqual({ membership: true, orders: false, payments: true });
  });

  it('answers 400 INVALID_PREFERENCES for a partial or non-boolean body, without calling the backend', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    for (const body of [{ membership: true, orders: true }, { membership: 'yes', orders: true, payments: true }, null]) {
      const res = await PUT(req(body));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'INVALID_PREFERENCES' });
    }
    expect(updateMock).not.toHaveBeenCalled();
  });
});
