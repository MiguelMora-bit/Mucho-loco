import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiGet, apiGetOrNull, apiPost, ApiRequestError } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Guarda la última request para poder afirmar sobre URL/headers/body. */
function stubFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (url: string | URL, init?: RequestInit) =>
    impl(String(url), init ?? {}),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('http client', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('apiGet builds the URL from NEXT_PUBLIC_API_URL and parses the JSON body', async () => {
    const spy = stubFetch(() => jsonResponse([{ id: 1 }]));
    const data = await apiGet<{ id: number }[]>('/branches');

    expect(data).toEqual([{ id: 1 }]);
    expect(spy.mock.calls[0][0]).toBe('http://api.test/branches');
    expect(spy.mock.calls[0][1]?.method).toBe('GET');
  });

  it('strips a trailing slash from the base URL instead of doubling it', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test/');
    const spy = stubFetch(() => jsonResponse([]));
    await apiGet('/products');

    expect(spy.mock.calls[0][0]).toBe('http://api.test/products');
  });

  it('serializes query params and drops the undefined ones', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await apiGet('/products', { query: { cat: 'proteinas', page: 2, tag: undefined } });

    expect(spy.mock.calls[0][0]).toBe('http://api.test/products?cat=proteinas&page=2');
  });

  it('sends no query string when every param is undefined', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await apiGet('/products', { query: { cat: undefined } });

    expect(spy.mock.calls[0][0]).toBe('http://api.test/products');
  });

  it('attaches the Cognito ID token as a Bearer header when given one', async () => {
    const spy = stubFetch(() => jsonResponse({}));
    await apiGet('/users/me', { token: 'id-token-123' });

    const headers = spy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer id-token-123');
  });

  it('sends no Authorization header for public endpoints', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await apiGet('/branches');

    const headers = spy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('defaults to no-store and switches to a Next revalidate window when asked', async () => {
    const spy = stubFetch(() => jsonResponse([]));
    await apiGet('/users/me');
    await apiGet('/branches', { revalidate: 300 });

    const uncached = spy.mock.calls[0][1] as RequestInit & { next?: { revalidate: number } };
    const cached = spy.mock.calls[1][1] as RequestInit & { next?: { revalidate: number } };
    expect(uncached.cache).toBe('no-store');
    expect(uncached.next).toBeUndefined();
    expect(cached.cache).toBeUndefined();
    expect(cached.next).toEqual({ revalidate: 300 });
  });

  it('throws ApiRequestError carrying the status on a non-2xx response', async () => {
    stubFetch(() => jsonResponse({ message: 'nope' }, 500));

    await expect(apiGet('/branches')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 500,
      path: '/branches',
    });
  });

  it('apiGet treats a 404 as an error, apiGetOrNull turns it into null', async () => {
    stubFetch(() => jsonResponse({ message: 'Branch not found' }, 404));

    await expect(apiGet('/branches/9999')).rejects.toBeInstanceOf(ApiRequestError);
    await expect(apiGetOrNull('/branches/9999')).resolves.toBeNull();
  });

  it('apiGetOrNull still throws on non-404 failures', async () => {
    stubFetch(() => jsonResponse({}, 401));

    await expect(apiGetOrNull('/users/me')).rejects.toMatchObject({ status: 401 });
  });

  it('wraps a network failure as ApiRequestError with status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    await expect(apiGet('/branches')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 0,
    });
  });

  it('fails with a clear message when NEXT_PUBLIC_API_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    stubFetch(() => jsonResponse([]));

    await expect(apiGet('/branches')).rejects.toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it('apiPost sends a JSON body with the right content type', async () => {
    const spy = stubFetch(() => jsonResponse({ ok: true }, 201));
    const out = await apiPost<{ ok: boolean }>('/users/me/orders', { items: [] }, { token: 't' });

    expect(out).toEqual({ ok: true });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"items":[]}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('returns undefined for a 204 instead of blowing up on an empty body', async () => {
    stubFetch(() => new Response(null, { status: 204 }));

    await expect(apiPost('/whatever', {})).resolves.toBeUndefined();
  });
});
