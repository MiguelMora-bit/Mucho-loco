import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCurrentUserEmailMock = vi.fn();
vi.mock('../../../lib/session', () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));

const createOrderMock = vi.fn();
vi.mock('../../../lib/repositories/user.repository', () => ({
  userRepository: { createOrder: (...args: unknown[]) => createOrderMock(...args) },
}));

const { POST } = await import('./route');
const { OrderValidationError } = await import('@mucho-loco/customer-core/mock');

const HOME_ADDRESS = {
  street: 'Av. Insurgentes Sur 1234',
  neighborhood: 'Roma Sur',
  city: 'Cuauhtémoc',
  state: 'CDMX',
  postalCode: '06760',
  phone: '+525512345678',
};

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
    const res = await POST(req({ items: [], paymentMethod: 'cash', delivery: { method: 'pickup' }, lang: 'es' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'UNAUTHORIZED' });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('creates the order under the verified session email, never a client-supplied one', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    const order = { id: 'o1', items: [], total: 100 };
    createOrderMock.mockResolvedValue(order);

    const res = await POST(
      req({ items: [{ productId: 'p1', qty: 2 }], paymentMethod: 'cash', delivery: { method: 'pickup' }, lang: 'es' }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(order);
    expect(createOrderMock).toHaveBeenCalledWith(
      'diego@mucholoco.mx',
      [{ productId: 'p1', qty: 2 }],
      'cash',
      { method: 'pickup' },
      'es',
    );
  });

  // El precio lo pone el servidor. Un cliente puede mandar lo que quiera en el
  // body — si `total` volviera a leerse aquí, se podría comprar a $1.
  it('ignores a client-supplied total instead of passing it through', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    createOrderMock.mockResolvedValue({ id: 'o1' });

    await POST(
      req({ items: [{ productId: 'p1', qty: 1 }], total: 1, paymentMethod: 'cash', delivery: { method: 'pickup' }, lang: 'es' }),
    );

    expect(createOrderMock.mock.calls[0]).not.toContain(1);
  });

  it('turns a rejected order into a 400 instead of a 500', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    createOrderMock.mockRejectedValue(
      new OrderValidationError('cash payment method requires pickup delivery'),
    );

    const res = await POST(
      req({
        items: [{ productId: 'p1', qty: 1 }],
        paymentMethod: 'cash',
        delivery: { method: 'home', address: HOME_ADDRESS },
        lang: 'es',
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'INVALID_ORDER' });
  });

  // Sin pasarela solo hay efectivo. Antes 'transfer', 'paypal' o 'card'
  // creaban el pedido como pagado sin cobrar nada.
  it('rejects an online payment method with 400 without reaching the repository', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');

    for (const paymentMethod of ['transfer', 'paypal', 'mercadopago', 'stripe']) {
      const res = await POST(
        req({ items: [{ productId: 'p1', qty: 1 }], paymentMethod, delivery: { method: 'pickup' }, lang: 'es' }),
      );
      expect(res.status).toBe(400);
    }
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  // El body lo arma el browser: un `delivery` con otra forma (el string de
  // antes, o nada) es un pedido inválido, no un 500 dentro del repositorio.
  it('rejects a malformed delivery with 400 without reaching the repository', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');

    const res = await POST(req({ items: [{ productId: 'p1', qty: 1 }], paymentMethod: 'cash', delivery: 'home', lang: 'es' }));

    expect(res.status).toBe(400);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('lets an unexpected failure bubble up as a 500 rather than masking it as a bad request', async () => {
    getCurrentUserEmailMock.mockResolvedValue('diego@mucholoco.mx');
    createOrderMock.mockRejectedValue(new Error('backend caído'));

    await expect(
      POST(req({ items: [{ productId: 'p1', qty: 1 }], paymentMethod: 'cash', delivery: { method: 'pickup' }, lang: 'es' })),
    ).rejects.toThrow('backend caído');
  });
});
