import { describe, it, expect } from 'vitest';
import { paymentRepository } from './payment.repository';
import { userRepository } from './user.repository';
import { ALL_GYMS_TEST_EMAIL, OrderValidationError } from '../datasources/mock/user.mock';
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
