import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@mucho-loco/api-client';
import {
  AnnouncementHttpDatasource,
  BranchHttpDatasource,
  CATALOG_MAX_AGE,
  CommunityHttpDatasource,
  InvoicingHttpDatasource,
  LANDING_MAX_AGE,
  MembershipHttpDatasource,
  PaymentHttpDatasource,
  PerformanceHttpDatasource,
  ProductHttpDatasource,
  SocialHttpDatasource,
  UserHttpDatasource,
} from './index';
import type { FiscalProfile, OrderDelivery, ShippingAddress } from '@mucho-loco/types';
import { invoicingErrorOf } from '../invoicing-errors';

const HOME_ADDRESS: ShippingAddress = {
  street: 'Av. Insurgentes Sur 1234',
  neighborhood: 'Roma Sur',
  city: 'Cuauhtémoc',
  state: 'CDMX',
  postalCode: '06760',
  phone: '+525512345678',
};
const HOME: OrderDelivery = { method: 'home', address: HOME_ADDRESS };

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

  // Spec 015: solo el teléfono viaja; quién es lo dice el token.
  it('puts only the phone to /users/me/phone', async () => {
    const spy = stubFetch({});
    await new UserHttpDatasource(client().api).updatePhone('otro@mucholoco.mx', '+525512345678');

    const { url, init, auth } = call(spy);
    expect(url).toBe('http://api.test/users/me/phone');
    expect(init.method).toBe('PUT');
    expect(auth).toBe('Bearer id-token');
    expect(JSON.parse(init.body as string)).toEqual({ phone: '+525512345678' });
  });

  it('posts an order as productId+qty with no client-supplied total', async () => {
    const spy = stubFetch({});
    await new UserHttpDatasource(client().api).createOrder(
      'diego@mucholoco.mx',
      [{ productId: 'p1', qty: 2 }],
      'cash',
      { method: 'pickup' },
      'es',
    );

    const { url, init } = call(spy);
    expect(url).toBe('http://api.test/users/me/orders');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      items: [{ productId: 'p1', qty: 2 }],
      paymentMethod: 'cash',
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

  it('opens the Stripe portal with the return url and language, never the email (spec 005)', async () => {
    const spy = stubFetch({ url: 'https://billing.stripe.com/p/x' });
    const res = await new PaymentHttpDatasource(client().api).openBillingPortal('otro@mucholoco.mx', 'https://x/es/dashboard', 'es');

    const { url, init, auth } = call(spy);
    expect(url).toBe('http://api.test/payments/billing-portal-sessions');
    expect(JSON.parse(String(init.body))).toEqual({ returnUrl: 'https://x/es/dashboard', lang: 'es' });
    expect(auth).toBe('Bearer id-token');
    expect(res.url).toBe('https://billing.stripe.com/p/x');
  });
});

describe('PaymentHttpDatasource', () => {
  it('posts productId+qty and the return urls, with the session token', async () => {
    const spy = stubFetch({});
    await new PaymentHttpDatasource(client().api).createCheckoutSession(
      'diego@mucholoco.mx',
      [{ productId: 'p1', qty: 2 }],
      HOME,
      'es',
      'mucholoco://checkout?paid=1',
      'mucholoco://checkout',
    );

    const { url, init, auth } = call(spy);
    expect(url).toBe('http://api.test/payments/checkout-sessions');
    expect(auth).toBe('Bearer id-token');
    // En el cable, `delivery` sigue siendo el string y la dirección va aparte
    // — la forma que valida CreateCheckoutSessionDto.
    expect(JSON.parse(String(init.body))).toEqual({
      items: [{ productId: 'p1', qty: 2 }],
      delivery: 'home',
      address: HOME_ADDRESS,
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
      { method: 'pickup' },
      'es',
      'http://x',
      'http://y',
    );

    expect(String(call(spy).init.body)).not.toMatch(/total|amount|price/);
  });
});

describe('InvoicingHttpDatasource', () => {
  const PROFILE: FiscalProfile = {
    taxId: 'CUPU800825569',
    legalName: 'JUAN PÉREZ',
    taxSystem: '612',
    zip: '06700',
    cfdiUse: 'G03',
    email: null,
  };

  it('maps each repository method to its backend route, always with the session token', async () => {
    const spy = stubFetch({});
    const ds = new InvoicingHttpDatasource(client().api);

    await ds.getFiscalProfile('ignorado@test.mx');
    await ds.saveFiscalProfile('ignorado@test.mx', PROFILE);
    await ds.getCharges('ignorado@test.mx');
    await ds.invoiceCharge('ignorado@test.mx', 'ch/1');

    expect(call(spy, 0)).toMatchObject({ url: 'http://api.test/users/me/fiscal-profile', auth: 'Bearer id-token' });
    expect(call(spy, 0).init.method).toBe('GET');
    expect(call(spy, 1).url).toBe('http://api.test/users/me/fiscal-profile');
    expect(call(spy, 1).init.method).toBe('PUT');
    expect(JSON.parse(call(spy, 1).init.body as string)).toEqual(PROFILE);
    expect(call(spy, 2).url).toBe('http://api.test/users/me/charges');
    // El id va escapado: un id con "/" no puede cambiar la ruta.
    expect(call(spy, 3).url).toBe('http://api.test/users/me/charges/ch%2F1/invoice');
    expect(call(spy, 3).init.method).toBe('POST');
    for (let i = 0; i < 4; i++) {
      expect(call(spy, i).auth).toBe('Bearer id-token');
      // La identidad es el token; el correo del contrato nunca viaja.
      expect(call(spy, i).url).not.toContain('ignorado');
      expect(String(call(spy, i).init.body ?? '')).not.toContain('ignorado');
    }
  });

  it('no fiscal data yet is null, not an error', async () => {
    stubFetch({ code: 'FISCAL_PROFILE_NOT_FOUND' }, 404);
    await expect(new InvoicingHttpDatasource(client().api).getFiscalProfile('x')).resolves.toBeNull();
  });

  it('downloads the invoice bytes from its route', async () => {
    const spy = vi.fn(
      async () =>
        new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="F-1.pdf"' },
        }),
    );
    vi.stubGlobal('fetch', spy);

    const file = await new InvoicingHttpDatasource(client().api).downloadInvoice('x', 'cfdi 1', 'pdf');

    expect(String((spy.mock.calls[0] as unknown[])[0])).toBe('http://api.test/users/me/invoices/cfdi%201/pdf');
    expect(file).toMatchObject({ contentType: 'application/pdf', filename: 'F-1.pdf' });
    expect(Array.from(file.data)).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it('names the file when the backend does not', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<xml/>', { status: 200, headers: { 'Content-Type': 'application/xml' } })),
    );
    const file = await new InvoicingHttpDatasource(client().api).downloadInvoice('x', 'cfdi-9', 'xml');
    expect(file.filename).toBe('factura-cfdi-9.xml');
  });

  it.each([
    ['FISCAL_PROFILE_REQUIRED', 400],
    ['CHARGE_NOT_FOUND', 404],
    ['CHARGE_ALREADY_INVOICED', 409],
    ['INVOICING_WINDOW_CLOSED', 409],
    ['CHARGE_NOT_INVOICEABLE', 409],
    ['INVOICING_UNAVAILABLE', 503],
    ['INVOICING_PROVIDER_ERROR', 502],
  ])('reads the backend %s rejection as the same typed error the mock throws', async (code, status) => {
    stubFetch({ code, message: 'prosa en español' }, status);
    const err = await new InvoicingHttpDatasource(client().api).invoiceCharge('x', 'c1').catch((e: unknown) => e);
    expect(invoicingErrorOf(err)).toEqual({ code });
  });

  it("keeps the SAT's reason on a fiscal-data rejection", async () => {
    stubFetch({ code: 'FISCAL_DATA_REJECTED', message: 'El RFC no existe', detail: 'El RFC no existe' }, 422);
    const err = await new InvoicingHttpDatasource(client().api).invoiceCharge('x', 'c1').catch((e: unknown) => e);
    expect(invoicingErrorOf(err)).toEqual({ code: 'FISCAL_DATA_REJECTED', detail: 'El RFC no existe' });
  });

  it('a 500 or a dead network is not a business rejection', async () => {
    stubFetch({ message: 'boom' }, 500);
    const serverError = await new InvoicingHttpDatasource(client().api).invoiceCharge('x', 'c1').catch((e: unknown) => e);
    expect(invoicingErrorOf(serverError)).toBeNull();

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    const network = await new InvoicingHttpDatasource(client().api).getCharges('x').catch((e: unknown) => e);
    expect(invoicingErrorOf(network)).toBeNull();
  });
});
