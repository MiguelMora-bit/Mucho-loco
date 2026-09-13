import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError as SharedApiRequestError } from '@mucho-loco/api-client';
import { BranchHttpDatasource, UserHttpDatasource } from '@mucho-loco/customer-core/http';
import { accountApi } from './account-client';
import { ApiRequestError, nextCachePolicy, publicApi } from './client';

// El comportamiento genérico del cliente lo prueba @mucho-loco/api-client y el
// de cada ruta lo prueba customer-core. Aquí solo lo que es de ESTE app: la
// política de Next y de dónde sale (y de dónde NO sale) el token.

// La cookie ml_session solo existe en el servidor de Next; aquí se simula.
const cookie = vi.hoisted(() => ({ value: 'id-token' as string | undefined, reads: 0 }));
vi.mock('./session-token', () => ({
  cookieSessionToken: async () => {
    cookie.reads += 1;
    return cookie.value;
  },
}));

function stubFetch(body: unknown = []) {
  const spy = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const initOf = (spy: ReturnType<typeof stubFetch>) =>
  spy.mock.calls[0][1] as RequestInit & { next?: { revalidate: number } };

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test');
  cookie.value = 'id-token';
  cookie.reads = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('nextCachePolicy', () => {
  it('revalidates what declares a max age and never caches the rest', () => {
    expect(nextCachePolicy(300)).toEqual({ next: { revalidate: 300 } });
    expect(nextCachePolicy(undefined)).toEqual({ cache: 'no-store' });
  });
});

describe('publicApi', () => {
  it('caches the public catalog with the Next revalidate window', async () => {
    const spy = stubFetch();
    await new BranchHttpDatasource(publicApi).getAll();

    expect(initOf(spy).next).toEqual({ revalidate: 300 });
    expect(initOf(spy).cache).toBeUndefined();
  });

  // Estos repositorios también corren en el navegador (stores de la landing),
  // donde la cookie httpOnly no existe.
  it('never reads the session cookie nor sends a token', async () => {
    const spy = stubFetch();
    await new BranchHttpDatasource(publicApi).getAll();

    expect(cookie.reads).toBe(0);
    expect((initOf(spy).headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('fails with a clear message when NEXT_PUBLIC_API_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    stubFetch();

    await expect(new BranchHttpDatasource(publicApi).getAll()).rejects.toThrow(/NEXT_PUBLIC_API_URL/);
  });
});

describe('accountApi', () => {
  it('sends the ml_session cookie as the Bearer token and never caches', async () => {
    const spy = stubFetch({});
    await new UserHttpDatasource(accountApi).getOrders('diego@mucholoco.mx');

    expect((initOf(spy).headers as Record<string, string>).Authorization).toBe('Bearer id-token');
    expect(initOf(spy).cache).toBe('no-store');
  });

  it('fails before the request, naming the cookie, when there is no session', async () => {
    cookie.value = undefined;
    const spy = stubFetch({});

    await expect(new UserHttpDatasource(accountApi).getProfile('diego@mucholoco.mx')).rejects.toThrow(/ml_session/);
    expect(spy).not.toHaveBeenCalled();
  });
});

// `order-errors.ts` hace `instanceof ApiRequestError` con el re-export de este
// módulo: tiene que ser la MISMA clase que tira el cliente compartido.
it('re-exports the shared ApiRequestError class', () => {
  expect(ApiRequestError).toBe(SharedApiRequestError);
});
