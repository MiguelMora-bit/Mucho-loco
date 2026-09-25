import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CounterSaleHttpDatasource } from './counterSale.http';
import { ApiRequestError } from './client';
import { InsufficientStockError, ProductNotFoundError } from '../../repositories/counterSale.errors';
import { useAuthStore } from '../../stores/auth.store';
import i18n from '../../i18n';

function stubFetch(status = 200, body: unknown = []) {
  const spy = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const call = (spy: ReturnType<typeof stubFetch>, i = 0) => ({
  url: String(spy.mock.calls[i][0]),
  init: (spy.mock.calls[i][1] ?? {}) as RequestInit,
  auth: ((spy.mock.calls[i][1]?.headers ?? {}) as Record<string, string>).Authorization,
});

const STAFF = {
  email: 'luis@mucholoco.mx',
  name: 'Luis Ángel Ortega',
  role: 'staff' as const,
  branchId: 1,
  branchName: 'Roma Sur',
};

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.test');
  useAuthStore.getState().setSession({
    user: STAFF,
    idToken: 'id-token',
    refreshToken: 'refresh',
    idTokenExp: Math.floor(Date.now() / 1000) + 3600,
  });
});

afterEach(() => {
  useAuthStore.getState().clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('CounterSaleHttpDatasource', () => {
  it('reads the inventory of that branch and nobody else', async () => {
    const spy = stubFetch();
    await new CounterSaleHttpDatasource().getInventory(3);

    expect(call(spy).url).toContain('http://api.test/branches/3/inventory');
  });

  // El backend arma "Whey Protein 5LBS · Fresa" a partir de un LocalizedString,
  // así que necesita saber en qué idioma está la pantalla.
  it('tells the backend which language to flatten product names into', async () => {
    const spy = stubFetch();
    await i18n.changeLanguage('en');
    await new CounterSaleHttpDatasource().getInventory(1);
    expect(call(spy).url).toContain('lang=en');

    await i18n.changeLanguage('es');
    await new CounterSaleHttpDatasource().getInventory(1);
    expect(call(spy, 1).url).toContain('lang=es');
  });

  it('sends the staff ID token on every call', async () => {
    const spy = stubFetch();
    await new CounterSaleHttpDatasource().getInventory(1);

    expect(call(spy).auth).toBe('Bearer id-token');
  });

  it('refuses to call the API with no staff session', async () => {
    stubFetch();
    useAuthStore.getState().clear();

    await expect(new CounterSaleHttpDatasource().getInventory(1)).rejects.toThrow(/sin sesión/i);
  });

  it('posts only productId and qty — the server prices the sale', async () => {
    const spy = stubFetch(201, {});
    await new CounterSaleHttpDatasource().createSale(
      1,
      [{ productId: 'p7', qty: 2 }],
      'cash',
    );

    const { url, init } = call(spy);
    expect(url).toContain('http://api.test/branches/1/counter-sales');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      picks: [{ productId: 'p7', qty: 2 }],
      paymentMethod: 'cash',
    });
    expect(String(init.body)).not.toMatch(/total|unitPrice/);
  });

  // Spec 009: el SAT distingue crédito de débito; solo viaja con tarjeta.
  it('sends the card type only for card payments', async () => {
    const spy = stubFetch(201, {});
    await new CounterSaleHttpDatasource().createSale(1, [{ productId: 'p7', qty: 1 }], 'card', 'debit');
    await new CounterSaleHttpDatasource().createSale(1, [{ productId: 'p7', qty: 1 }], 'cash', 'debit');

    expect(JSON.parse(String(call(spy, 0).init.body)).cardType).toBe('debit');
    expect(JSON.parse(String(call(spy, 1).init.body))).not.toHaveProperty('cardType');
  });

  describe('error mapping', () => {
    // El contrato promete errores TIPADOS para que la UI no lea prosa en
    // español — ver counterSale.errors.ts. El código del backend es lo que
    // hace posible traducirlos.
    it('turns INSUFFICIENT_STOCK into the typed error, keeping the product name', async () => {
      stubFetch(400, {
        code: 'INSUFFICIENT_STOCK',
        productId: 'p11',
        productName: "BCAA's en polvo · Watermelon",
        available: 0,
        requested: 1,
      });

      const err = await new CounterSaleHttpDatasource()
        .createSale(1, [{ productId: 'p11', qty: 1 }], 'cash')
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(InsufficientStockError);
      expect((err as InsufficientStockError).productName).toBe("BCAA's en polvo · Watermelon");
    });

    it('turns PRODUCT_NOT_FOUND into the typed error, keeping the id', async () => {
      stubFetch(404, { code: 'PRODUCT_NOT_FOUND', productId: 'fantasma' });

      const err = await new CounterSaleHttpDatasource()
        .createSale(1, [{ productId: 'fantasma', qty: 1 }], 'cash')
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ProductNotFoundError);
      expect((err as ProductNotFoundError).productId).toBe('fantasma');
    });

    // Para quien está cobrando es lo mismo: no se puede vender aquí.
    it('treats a product this branch does not stock as product-not-found', async () => {
      stubFetch(404, { code: 'BRANCH_DOES_NOT_STOCK_PRODUCT', branchId: 3, productId: 'p1' });

      const err = await new CounterSaleHttpDatasource()
        .createSale(3, [{ productId: 'p1', qty: 1 }], 'cash')
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ProductNotFoundError);
    });

    // Un 500 o una red caída no son errores de negocio y no deben disfrazarse
    // de uno: si se mapearan, la UI diría "sin stock" cuando el backend murió.
    it('lets an unexpected failure through as-is', async () => {
      stubFetch(500, { message: 'boom' });

      const err = await new CounterSaleHttpDatasource()
        .createSale(1, [{ productId: 'p7', qty: 1 }], 'cash')
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ApiRequestError);
      expect((err as ApiRequestError).status).toBe(500);
    });
  });
});
