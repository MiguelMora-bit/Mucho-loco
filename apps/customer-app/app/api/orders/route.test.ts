import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentUserEmailMock = vi.fn();
vi.mock('../../../lib/session', () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));

const createOrderMock = vi.fn();
vi.mock('../../../lib/repositories/user.repository', () => ({
  userRepository: { createOrder: (...args: unknown[]) => createOrderMock(...args) },
}));

const { POST } = await import('./route');

function req(body: unknown) {
  return new Request('http://localhost/api/orders', { method: 'POST', body: JSON.stringify(body) });
}

beforeEach(() => {
  getCurrentUserEmailMock.mockReset();
  createOrderMock.mockReset();
});

describe('POST /api/orders', () => {
  it('rejects with 401 UNAUTHORIZED when there is no verified session (middleware does not cover /api/*)', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null);
    const res = await POST(req({ items: [], total: 0, paymentMethod: 'card', delivery: 'pickup' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'UNAUTHORIZED' });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('creates the order under the verified session email, never a client-supplied one', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    const order = { id: 'o1', items: [], total: 100 };
    createOrderMock.mockResolvedValue(order);

    const res = await POST(req({ items: [{ id: 'p1' }], total: 100, paymentMethod: 'card', delivery: 'pickup' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(order);
    expect(createOrderMock).toHaveBeenCalledWith('diego@mucholoco.mx', [{ id: 'p1' }], 100, 'card', 'pickup');
  });
});
