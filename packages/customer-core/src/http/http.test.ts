import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@mucho-loco/api-client';
import {
  AnnouncementHttpDatasource,
  BranchHttpDatasource,
  CATALOG_MAX_AGE,
  CommunityHttpDatasource,
  LANDING_MAX_AGE,
  MembershipHttpDatasource,
  PaymentHttpDatasource,
  PerformanceHttpDatasource,
  ProductHttpDatasource,
  SocialHttpDatasource,
  UserHttpDatasource,
} from './index';

// El comportamiento genérico del cliente (URL, errores, timeout) lo prueba
// @mucho-loco/api-client. Aquí importa lo que cada datasource decide: a qué
// ruta pega, con o sin token, con cuánta edad de caché, y qué NUNCA manda.

function stubFetch(body: unknown = {}, status = 200) {
  const spy = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const call = (spy: ReturnType<typeof stubFetch>, i = 0) => ({
  url: String(spy.mock.calls[i][0]),
  init: (spy.mock.calls[i][1] ?? {}) as RequestInit,
  auth: ((spy.mock.calls[i][1]?.headers ?? {}) as Record<string, string>).Authorization,
});

/**
 * Cliente de prueba con el token y la política de caché espiables. `null` =
 * sin sesión (y no `undefined`: pasar `undefined` activaría el default).
 */
function client(token: string | null = 'id-token') {
  const getToken = vi.fn(() => token ?? undefined);
  const cachePolicy = vi.fn((_maxAge: number | undefined) => ({}));
  const api = createApiClient({
    baseUrl: () => 'http://api.test',
    getToken,
    cachePolicy,
    missingTokenMessage: 'Sin sesión (cookie ml_session)',
  });
  return { api, getToken, cachePolicy };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BranchHttpDatasource', () => {
  it('maps each repository method to its backend route', async () => {
    const spy = stubFetch([]);
    const ds = new BranchHttpDatasource(client().api);

    await ds.getAll();
    await ds.getFeatured();
    await ds.getById(7);

    expect(call(spy, 0).url).toBe('http://api.test/branches');
    expect(call(spy, 1).url).toBe('http://api.test/branches/featured');
    expect(call(spy, 2).url).toBe('http://api.test/branches/7');
  });

  it('getById returns null on a 404, same contract as the mock', async () => {
    stubFetch({}, 404);
    await expect(new BranchHttpDatasource(client().api).getById(9999)).resolves.toBeNull();
  });

  it('is public: never reads the session and declares the catalog max age', async () => {
    const spy = stubFetch([]);
    const { api, getToken, cachePolicy } = client();
    await new BranchHttpDatasource(api).getAll();

    expect(getToken).not.toHaveBeenCalled();
    expect(call(spy).auth).toBeUndefined();
    expect(cachePolicy).toHaveBeenCalledWith(CATALOG_MAX_AGE);
  });
});

describe('ProductHttpDatasource', () => {
  it('maps each repository method to its backend route', async () => {
    const spy = stubFetch([]);
    const ds = new ProductHttpDatasource(client().api);

    await ds.getAll();
    await ds.getById('whey-choco');
    await ds.getByCategory('proteinas');
    await ds.getSiblings('whey-choco', 'proteinas');

    expect(call(spy, 0).url).toBe('http://api.test/products');
    expect(call(spy, 1).url).toBe('http://api.test/products/whey-choco');
    expect(call(spy, 2).url).toBe('http://api.test/products?cat=proteinas');
    expect(call(spy, 3).url).toBe('http://api.test/products/whey-choco/siblings');
  });

  it('translates the "all" sentinel to an unfiltered GET /products', async () => {
    const spy = stubFetch([]);
    await new ProductHttpDatasource(client().api).getByCategory('all');

    // Sin ?cat=all: el backend no conoce esa categoría y devolvería vacío.
    expect(call(spy).url).toBe('http://api.test/products');
  });

  it('getById returns null on a 404, same contract as the mock', async () => {
    stubFetch({}, 404);
    await expect(new ProductHttpDatasource(client().api).getById('no-existe')).resolves.toBeNull();
  });
});

describe('public landing datasources', () => {
  it('hit their backend routes without a token', async () => {
    const spy = stubFetch([]);
    const { api, getToken, cachePolicy } = client();
    await new AnnouncementHttpDatasource(api).getAll();
    await new SocialHttpDatasource(api).getLinks();
    await new SocialHttpDatasource(api).getFeed();
    await new MembershipHttpDatasource(api).getTiers();

    expect(call(spy, 0).url).toBe('http://api.test/announcements');
    expect(call(spy, 1).url).toBe('http://api.test/social/links');
    expect(call(spy, 2).url).toBe('http://api.test/social/feed');
    expect(call(spy, 3).url).toBe('http://api.test/membership-tiers');
    expect(getToken).not.toHaveBeenCalled();
    expect(cachePolicy).toHaveBeenNthCalledWith(1, LANDING_MAX_AGE);
    expect(cachePolicy).toHaveBeenNthCalledWith(4, CATALOG_MAX_AGE);
  });
});

describe('UserHttpDatasource', () => {
  it('maps every repository method to its /users/me route, always with the token', async () => {
    const spy = stubFetch({});
    const ds = new UserHttpDatasource(client().api);

    await ds.getProfile('ignored@mucholoco.mx');
    await ds.getMembership('ignored@mucholoco.mx');
    await ds.getVisitHistory('ignored@mucholoco.mx');
    await ds.getOrders('ignored@mucholoco.mx');

    expect(call(spy, 0).url).toBe('http://api.test/users/me');
    expect(call(spy, 1).url).toBe('http://api.test/users/me/membership');
    expect(call(spy, 2).url).toBe('http://api.test/users/me/visits');
    expect(call(spy, 3).url).toBe('http://api.test/users/me/orders');
    expect(spy.mock.calls.every((_, i) => call(spy, i).auth === 'Bearer id-token')).toBe(true);
  });

  // Un socio nuevo nace sin membresía y el backend responde 404: eso es "no
  // ha contratado", no un error de conexión en el panel.
  it('reads a 404 membership as "not a member yet"', async () => {
    stubFetch({ message: 'Membership not found for user' }, 404);

    expect(await new UserHttpDatasource(client().api).getMembership('x@y.mx')).toBeNull();
  });

  // La identidad del mock era un parámetro; la del backend es el ID token. Si
  // el email volviera a viajar en la URL o el body, un cliente podría leer la
  // cuenta de alguien más — ver "Seguridad" en apps/backend/CLAUDE.md.
  it('never puts the caller-supplied email in the request', async () => {
    const spy = stubFetch({});
    await new UserHttpDatasource(client().api).getProfile('otro@mucholoco.mx');

    const { url, init } = call(spy);
    expect(url).not.toContain('otro@mucholoco.mx');
    expect(String(init.body ?? '')).not.toContain('otro@mucholoco.mx');
  });

  it('posts an order as productId+qty with no client-supplied total', async () => {
    const spy = stubFetch({});
    await new UserHttpDatasource(client().api).createOrder(
      'diego@mucholoco.mx',
      [{ productId: 'p1', qty: 2 }],
      'card',
      'pickup',
      'es',
    );

    const { url, init } = call(spy);
    expect(url).toBe('http://api.test/users/me/orders');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      items: [{ productId: 'p1', qty: 2 }],
      paymentMethod: 'card',
      delivery: 'pickup',
      lang: 'es',
    });
    expect(String(init.body)).not.toContain('total');
  });

  it('never declares a max age for account data', async () => {
    stubFetch({});
    const { api, cachePolicy } = client();
    await new UserHttpDatasource(api).getOrders('diego@mucholoco.mx');

    expect(cachePolicy).toHaveBeenCalledWith(undefined);
  });

  it('fails with the app message when there is no session', async () => {
    const spy = stubFetch({});
    const ds = new UserHttpDatasource(client(null).api);

    await expect(ds.getProfile('diego@mucholoco.mx')).rejects.toThrow(/ml_session/);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('CommunityHttpDatasource', () => {
  it('maps every repository method to its /community/posts route', async () => {
    const spy = stubFetch({});
    const ds = new CommunityHttpDatasource(client().api);

    await ds.getFeed('diego@mucholoco.mx');
    await ds.createPost('diego@mucholoco.mx', 'hola');
    await ds.toggleLike('diego@mucholoco.mx', 'post-1');
    await ds.addComment('diego@mucholoco.mx', 'post-1', 'buen post');

    expect(call(spy, 0).url).toBe('http://api.test/community/posts');
    expect(call(spy, 1).url).toBe('http://api.test/community/posts');
    expect(call(spy, 1).init.method).toBe('POST');
    expect(call(spy, 2).url).toBe('http://api.test/community/posts/post-1/like');
    expect(call(spy, 3).url).toBe('http://api.test/community/posts/post-1/comments');
    expect(call(spy, 3).auth).toBe('Bearer id-token');
  });

  // El autor lo deriva el backend del ID token — el body solo lleva el texto.
  it('sends only the post body, never an author identity', async () => {
    const spy = stubFetch({});
    await new CommunityHttpDatasource(client().api).createPost('diego@mucholoco.mx', 'hola');

    expect(JSON.parse(String(call(spy).init.body))).toEqual({ body: 'hola' });
  });
});

describe('PerformanceHttpDatasource', () => {
  it('maps every repository method to its /performance route, with the token', async () => {
    const spy = stubFetch([]);
    const ds = new PerformanceHttpDatasource(client().api);

    await ds.getStats();
    await ds.getPersonalRecords();
    await ds.getWorkouts();
    await ds.getHeatmap();

    expect(call(spy, 0).url).toBe('http://api.test/performance/stats');
    expect(call(spy, 1).url).toBe('http://api.test/performance/records');
    expect(call(spy, 2).url).toBe('http://api.test/performance/workouts');
    expect(call(spy, 3).url).toBe('http://api.test/performance/heatmap');
    expect(call(spy, 3).auth).toBe('Bearer id-token');
  });
});

describe('PaymentHttpDatasource — membresía', () => {
  it('sends only the plan choice and return urls — never an amount', async () => {
    const spy = stubFetch({ url: 'https://checkout.stripe.com/x' });
    await new PaymentHttpDatasource(client().api).createMembershipCheckout(
      'diego@mucholoco.mx',
      { branchId: 3, tierKey: 'single', periodKey: 'quarterly' },
      'es',
      'https://mucholoco.mx/es/dashboard?membership=paid',
      'https://mucholoco.mx/es/membership',
    );

    const { url, init, auth } = call(spy);
    expect(url).toBe('http://api.test/payments/membership-checkout-sessions');
    expect(init.method).toBe('POST');
    expect(auth).toBe('Bearer id-token');
    expect(JSON.parse(String(init.body))).toEqual({
      branchId: 3,
      tierKey: 'single',
      periodKey: 'quarterly',
      lang: 'es',
      successUrl: 'https://mucholoco.mx/es/dashboard?membership=paid',
      cancelUrl: 'https://mucholoco.mx/es/membership',
    });
  });

  it('asks for the pending invoice without sending the email or the return url', async () => {
    const spy = stubFetch({ url: 'https://invoice.stripe.com/i/x' });
    await new PaymentHttpDatasource(client().api).openMembershipInvoice('otro@mucholoco.mx', 'https://x/dashboard');

    const { url, init } = call(spy);
    expect(url).toBe('http://api.test/payments/membership-invoice');
    expect(String(init.body)).not.toContain('otro@mucholoco.mx');
  });
});

describe('PaymentHttpDatasource', () => {
  it('posts productId+qty and the return urls, with the session token', async () => {
    const spy = stubFetch({});
    await new PaymentHttpDatasource(client().api).createCheckoutSession(
      'diego@mucholoco.mx',
      [{ productId: 'p1', qty: 2 }],
      'home',
      'es',
      'mucholoco://checkout?paid=1',
      'mucholoco://checkout',
    );

    const { url, init, auth } = call(spy);
    expect(url).toBe('http://api.test/payments/checkout-sessions');
    expect(auth).toBe('Bearer id-token');
    expect(JSON.parse(String(init.body))).toEqual({
      items: [{ productId: 'p1', qty: 2 }],
      delivery: 'home',
      lang: 'es',
      successUrl: 'mucholoco://checkout?paid=1',
      cancelUrl: 'mucholoco://checkout',
    });
  });

  // El importe lo pone el servidor: si el body llevara un total, un cliente
  // podría comprar a $1.
  it('never sends an amount', async () => {
    const spy = stubFetch({});
    await new PaymentHttpDatasource(client().api).createCheckoutSession(
      'diego@mucholoco.mx',
      [{ productId: 'p1', qty: 1 }],
      'pickup',
      'es',
      'http://x',
      'http://y',
    );

    expect(String(call(spy).init.body)).not.toMatch(/total|amount|price/);
  });
});
