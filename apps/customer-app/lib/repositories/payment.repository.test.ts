import { describe, it, expect } from 'vitest';
import { paymentRepository } from './payment.repository';
import { userRepository } from './user.repository';
import { ALL_GYMS_TEST_EMAIL, SINGLE_GYM_TEST_EMAIL, OrderValidationError } from '@mucho-loco/customer-core/mock';
import { membershipErrorCode } from '@mucho-loco/customer-core/membership-errors';
import { PRODUCTS } from '../data';
import { HOME_SHIPPING_FEE } from '../pricing';

const WHEY = PRODUCTS.find((p) => p.id === 'p1')!;

describe('paymentRepository (mock)', () => {
  // Sin pasarela en modo mock el "cobro" es instantáneo, pero el pedido tiene
  // que quedar igual de bien armado que por cualquier otro camino — si no, el
  // flujo mock-first no sirve para probar el checkout.
  it('creates a real order priced from the catalog', async () => {
    const before = await userRepository.getOrders(ALL_GYMS_TEST_EMAIL);

    const session = await paymentRepository.createCheckoutSession(
      ALL_GYMS_TEST_EMAIL,
      [{ productId: WHEY.id, qty: 2 }],
      'pickup',
      'es',
      'http://localhost:3000/es/checkout?paid=1',
      'http://localhost:3000/es/checkout',
    );

    const after = await userRepository.getOrders(ALL_GYMS_TEST_EMAIL);
    expect(after).toHaveLength(before.length + 1);
    expect(after[0].id).toBe(session.orderId);
    expect(after[0].total).toBe(WHEY.price * 2);
  });

  it('sends the member straight to the success url, which is where a gateway would return them', async () => {
    const successUrl = 'http://localhost:3000/es/checkout?paid=1';

    const session = await paymentRepository.createCheckoutSession(
      ALL_GYMS_TEST_EMAIL,
      [{ productId: WHEY.id, qty: 1 }],
      'pickup',
      'es',
      successUrl,
      'http://localhost:3000/es/checkout',
    );

    expect(session.url).toBe(successUrl);
  });

  it('charges shipping for a home delivery, same as any other order', async () => {
    const session = await paymentRepository.createCheckoutSession(
      ALL_GYMS_TEST_EMAIL,
      [{ productId: WHEY.id, qty: 1 }],
      'home',
      'es',
      'http://x',
      'http://y',
    );

    const orders = await userRepository.getOrders(ALL_GYMS_TEST_EMAIL);
    const created = orders.find((o) => o.id === session.orderId);
    expect(created?.total).toBe(WHEY.price + HOME_SHIPPING_FEE);
  });

  it('rejects a pickup order from an account without a membership', async () => {
    await expect(
      paymentRepository.createCheckoutSession(
        `sin-membresia-${Date.now()}@mucholoco.mx`,
        [{ productId: WHEY.id, qty: 1 }],
        'pickup',
        'es',
        'http://x',
        'http://y',
      ),
    ).rejects.toBeInstanceOf(OrderValidationError);
  });

  it('rejects a product outside the catalog', async () => {
    await expect(
      paymentRepository.createCheckoutSession(
        ALL_GYMS_TEST_EMAIL,
        [{ productId: 'no-existe', qty: 1 }],
        'pickup',
        'es',
        'http://x',
        'http://y',
      ),
    ).rejects.toBeInstanceOf(OrderValidationError);
  });
});

/** El código del rechazo, igual si viene del mock o del backend. */
async function rejectionCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (e) {
    return membershipErrorCode(e);
  }
}

describe('paymentRepository — membresía (mock)', () => {
  const monthly = { branchId: 1, tierKey: 'single' as const, periodKey: 'monthly' as const };

  // En modo mock no hay Stripe: "pagar" activa al instante, que es lo que en
  // el backend hace el webhook. Las reglas de negocio sí se imitan.
  it('a new account has no membership until it buys one; then it is active and renews itself', async () => {
    const email = `nuevo-${Date.now()}@mucholoco.mx`;
    expect(await userRepository.getMembership(email)).toBeNull();

    const successUrl = 'http://localhost:3000/es/dashboard?membership=paid';
    const session = await paymentRepository.createMembershipCheckout(email, monthly, 'es', successUrl, 'http://x');

    expect(session.url).toBe(successUrl);
    expect(await userRepository.getMembership(email)).toMatchObject({
      status: 'active',
      tierKey: 'single',
      autoRenews: true,
    });
  });

  it('a day pass does not renew', async () => {
    const email = `visita-${Date.now()}@mucholoco.mx`;
    await paymentRepository.createMembershipCheckout(
      email,
      { ...monthly, tierKey: 'all', periodKey: 'visit' },
      'es',
      'http://x',
      'http://y',
    );

    expect((await userRepository.getMembership(email))?.autoRenews).toBe(false);
  });

  it('refuses a second subscription on top of a live one, like the backend', async () => {
    expect(
      await rejectionCode(
        paymentRepository.createMembershipCheckout(ALL_GYMS_TEST_EMAIL, monthly, 'es', 'http://x', 'http://y'),
      ),
    ).toBe('ALREADY_SUBSCRIBED');
  });

  it('in grace, paying the pending invoice brings the membership back', async () => {
    const returnUrl = 'http://localhost:3000/es/dashboard';
    const session = await paymentRepository.openMembershipInvoice(SINGLE_GYM_TEST_EMAIL, returnUrl);

    expect(session.url).toBe(returnUrl);
    expect(await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL)).toMatchObject({
      status: 'active',
      graceEndsAt: null,
    });
  });

  it('there is no invoice to pay when the membership is not in grace', async () => {
    expect(await rejectionCode(paymentRepository.openMembershipInvoice(ALL_GYMS_TEST_EMAIL, 'http://x'))).toBe(
      'NOTHING_TO_PAY',
    );
  });
});
