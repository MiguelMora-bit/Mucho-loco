import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient, type ApiClientConfig } from './index';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Guarda cada request para poder afirmar sobre URL/headers/body. */
function stubFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (url: string | URL, init?: RequestInit) => impl(String(url), init ?? {}));
  vi.stubGlobal('fetch', spy);
  return spy;
}

const client = (overrides: Partial<ApiClientConfig> = {}) =>
  createApiClient({ baseUrl: () => 'http://api.test', ...overrides });

const headersOf = (spy: ReturnType<typeof stubFetch>, i = 0) =>
  (spy.mock.calls[i][1]?.headers ?? {}) as Record<string, string>;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('URL', () => {
  it('builds the URL from the base and parses the JSON body', async () => {
    const spy = stubFetch(() => jsonResponse([{ id: 1 }]));

    await expect(client().get('/branches')).resolves.toEqual([{ id: 1 }]);
    expect(spy.mock.calls[0][0]).toBe('http://api.test/branches');
    expect(spy.mock.calls[0][1]?.method).toBe('GET');
  });

  it('strips a trailing slash from the base URL instead of doubling it', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await client({ baseUrl: () => 'http://api.test/' }).get('/products');

    expect(spy.mock.calls[0][0]).toBe('http://api.test/products');
  });

  it('serializes query params and drops the undefined ones', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await client().get('/products', { query: { cat: 'proteinas', page: 2, tag: undefined } });

    expect(spy.mock.calls[0][0]).toBe('http://api.test/products?cat=proteinas&page=2');
  });

  it('sends no query string when every param is undefined', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await client().get('/products', { query: { cat: undefined } });

    expect(spy.mock.calls[0][0]).toBe('http://api.test/products');
  });

  it('adds defaultQuery to every request, and a per-request query wins', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await client({ defaultQuery: () => ({ lang: 'es' }) }).get('/inventory', { query: { lang: 'en' } });

    expect(spy.mock.calls[0][0]).toBe('http://api.test/inventory?lang=en');
  });

  it('fails with the app-provided message when the base URL is missing', async () => {
    stubFetch(() => jsonResponse([]));

    await expect(
      client({ baseUrl: () => '', missingBaseUrlMessage: 'VITE_API_URL no está definida' }).get('/x'),
    ).rejects.toThrow(/VITE_API_URL/);
  });
});

describe('auth', () => {
  it('attaches the token as a Bearer header', async () => {
    const spy = stubFetch(() => jsonResponse({}));
    await client({ getToken: () => 'id-token-123' }).get('/users/me');

    expect(headersOf(spy).Authorization).toBe('Bearer id-token-123');
  });

  it('accepts an async token provider (a cookie read on the server)', async () => {
    const spy = stubFetch(() => jsonResponse({}));
    await client({ getToken: async () => 'from-cookie' }).get('/users/me');

    expect(headersOf(spy).Authorization).toBe('Bearer from-cookie');
  });

  // En customer-app el token sale de una cookie httpOnly que solo existe en el
  // servidor: un endpoint público nunca debe intentar leerla.
  it('never asks for the token on auth:false requests', async () => {
    const getToken = vi.fn(() => 'id-token');
    const spy = stubFetch(() => jsonResponse([]));
    await client({ getToken }).get('/branches', { auth: false });

    expect(getToken).not.toHaveBeenCalled();
    expect(headersOf(spy).Authorization).toBeUndefined();
  });

  it('sends no Authorization header when the client has no token provider', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await client().get('/branches');

    expect(headersOf(spy).Authorization).toBeUndefined();
  });

  it('fails before the request with the app message when there is no session', async () => {
    const spy = stubFetch(() => jsonResponse({}));

    await expect(
      client({ getToken: () => undefined, missingTokenMessage: 'Sin sesión (cookie ml_session)' }).get('/users/me'),
    ).rejects.toThrow(/ml_session/);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('cache policy', () => {
  it('passes maxAgeSeconds to the app policy and sends what it returns', async () => {
    const cachePolicy = vi.fn((maxAge: number | undefined) =>
      maxAge === undefined ? { cache: 'no-store' as const } : { next: { revalidate: maxAge } },
    );
    const spy = stubFetch(() => jsonResponse([]));
    const api = client({ cachePolicy });

    await api.get('/branches', { maxAgeSeconds: 300 });
    await api.get('/users/me');

    expect(cachePolicy).toHaveBeenNthCalledWith(1, 300);
    expect(cachePolicy).toHaveBeenNthCalledWith(2, undefined);
    const cached = spy.mock.calls[0][1] as RequestInit & { next?: { revalidate: number } };
    const fresh = spy.mock.calls[1][1] as RequestInit & { next?: { revalidate: number } };
    expect(cached.next).toEqual({ revalidate: 300 });
    expect(cached.cache).toBeUndefined();
    expect(fresh.cache).toBe('no-store');
  });

  it('lets raw per-request fetch options win over the policy', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await client({ cachePolicy: () => ({ cache: 'no-store' }) }).get('/x', { fetch: { cache: 'force-cache' } });

    expect(spy.mock.calls[0][1]?.cache).toBe('force-cache');
  });

  it('ignores maxAgeSeconds when the app has no policy (mobile, SPAs)', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await client().get('/branches', { maxAgeSeconds: 300 });

    expect(spy.mock.calls[0][1]?.cache).toBeUndefined();
  });
});

describe('responses and errors', () => {
  it('throws ApiRequestError with status, path and the backend error code', async () => {
    stubFetch(() => jsonResponse({ code: 'SHIFT_ALREADY_CLOSED', message: 'nope' }, 409));

    const err = await client().get('/shifts/1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 409, path: '/shifts/1', code: 'SHIFT_ALREADY_CLOSED' });
  });

  it('keeps the status when the error body is not JSON', async () => {
    stubFetch(() => new Response('<html>Bad gateway</html>', { status: 502 }));

    await expect(client().get('/x')).rejects.toMatchObject({ status: 502, body: {} });
  });

  it('get treats a 404 as an error, getOrNull turns it into null', async () => {
    stubFetch(() => jsonResponse({ message: 'Branch not found' }, 404));

    await expect(client().get('/branches/9999')).rejects.toBeInstanceOf(ApiRequestError);
    await expect(client().getOrNull('/branches/9999')).resolves.toBeNull();
  });

  it('getOrNull still throws on non-404 failures', async () => {
    stubFetch(() => jsonResponse({}, 401));

    await expect(client().getOrNull('/users/me')).rejects.toMatchObject({ status: 401 });
  });

  it('wraps a network failure as ApiRequestError with status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    await expect(client().get('/branches')).rejects.toMatchObject({ name: 'ApiRequestError', status: 0 });
  });

  it('returns undefined for an empty 200 or a 204 instead of blowing up', async () => {
    stubFetch(() => new Response(null, { status: 200 }));
    await expect(client().get('/attendance/open')).resolves.toBeUndefined();

    stubFetch(() => new Response(null, { status: 204 }));
    await expect(client().post('/whatever', {})).resolves.toBeUndefined();
  });

  it('post sends a JSON body with the right content type', async () => {
    const spy = stubFetch(() => jsonResponse({ ok: true }, 201));

    await expect(client().post('/users/me/orders', { items: [] })).resolves.toEqual({ ok: true });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"items":[]}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('post without a body still sends {} so the backend ValidationPipe gets JSON', async () => {
    const spy = stubFetch(() => jsonResponse({}));
    await client().post('/users/me/membership/retry-payment');

    expect(spy.mock.calls[0][1]?.body).toBe('{}');
  });
});

describe('timeout', () => {
  it('aborts a request that hangs past timeoutMs, as a status-0 error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          }),
      ),
    );

    await expect(client({ timeoutMs: 20 }).get('/slow')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 0,
    });
  });

  // React Native trae AbortController por el polyfill `abort-controller`, que
  // no tiene `AbortSignal.timeout()`. Si el cliente dependiera de él, en el
  // teléfono ninguna request saldría.
  it('works where AbortSignal.timeout does not exist (React Native)', async () => {
    const original = AbortSignal.timeout;
    Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true, writable: true });
    try {
      stubFetch(() => jsonResponse([{ id: 1 }]));
      await expect(client().get('/branches')).resolves.toEqual([{ id: 1 }]);
    } finally {
      Object.defineProperty(AbortSignal, 'timeout', { value: original, configurable: true, writable: true });
    }
  });
});
