import { describe, it, expect, vi, beforeEach } from 'vitest';

// Sesión simulada; el repositorio es el mock de verdad (spec 005).
const getCurrentUserEmailMock = vi.fn();
vi.mock('@/lib/session', () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));

const { POST } = await import('./route');
const { paymentRepository } = await import('@/lib/repositories/payment.repository');
const { userRepository } = await import('@/lib/repositories/user.repository');

const req = (body: unknown) =>
  POST(new Request('http://localhost/api/membership/portal', { method: 'POST', body: JSON.stringify(body) }));

let email: string;
beforeEach(() => {
  email = `portal.${Date.now()}.${Math.random()}@test.mx`;
  getCurrentUserEmailMock.mockReset();
  getCurrentUserEmailMock.mockResolvedValue(email);
});

describe('POST /api/membership/portal', () => {
  it('401 without a verified session (middleware does not cover /api/*)', async () => {
    getCurrentUserEmailMock.mockResolvedValue(null);
    expect((await req({ returnUrl: 'http://x', lang: 'es' })).status).toBe(401);
  });

  it('400 without a return url or language', async () => {
    expect((await req({ lang: 'es' })).status).toBe(400);
    expect((await req({ returnUrl: 'http://x', lang: 'fr' })).status).toBe(400);
  });

  it('409 NO_BILLING_ACCOUNT without a subscription', async () => {
    const res = await req({ returnUrl: 'http://x', lang: 'es' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'NO_BILLING_ACCOUNT' });
  });

  it('hands back the portal url for a subscribed member', async () => {
    await paymentRepository.createMembershipCheckout(email, { branchId: 1, tierKey: 'all', periodKey: 'monthly' }, 'es', 'http://ok', 'http://no');
    const res = await req({ returnUrl: 'http://localhost:3000/es/dashboard', lang: 'es' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'http://localhost:3000/es/dashboard' });
    // En el mock, "hacer algo en el portal" canceló la renovación.
    expect(await userRepository.getMembership(email)).toMatchObject({ autoRenews: false, hasSubscription: true });
  });
});
