import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BranchHttpDatasource } from './branch.http';
import { ProductHttpDatasource } from './product.http';

/** Solo importa qué URL se pidió — el parseo del body ya lo cubre client.test.ts. */
function stubFetch(status = 200, body: unknown = []) {
  const spy = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(status === 404 ? '{}' : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const urlOf = (spy: ReturnType<typeof stubFetch>, call = 0) => String(spy.mock.calls[call][0]);

describe('BranchHttpDatasource', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test'));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('maps each repository method to its backend route', async () => {
    const spy = stubFetch();
    const ds = new BranchHttpDatasource();

    await ds.getAll();
    await ds.getFeatured();
    await ds.getById(7);

    expect(urlOf(spy, 0)).toBe('http://api.test/branches');
    expect(urlOf(spy, 1)).toBe('http://api.test/branches/featured');
    expect(urlOf(spy, 2)).toBe('http://api.test/branches/7');
  });

  it('getById returns null on a 404, same contract as the mock', async () => {
    stubFetch(404);
    await expect(new BranchHttpDatasource().getById(9999)).resolves.toBeNull();
  });

  it('caches the public catalog instead of hitting the backend on every render', async () => {
    const spy = stubFetch();
    await new BranchHttpDatasource().getAll();

    const init = spy.mock.calls[0][1] as RequestInit & { next?: { revalidate: number } };
    expect(init.next).toEqual({ revalidate: 300 });
  });
});

describe('ProductHttpDatasource', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test'));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('maps each repository method to its backend route', async () => {
    const spy = stubFetch();
    const ds = new ProductHttpDatasource();

    await ds.getAll();
    await ds.getById('whey-choco');
    await ds.getByCategory('proteinas');
    await ds.getSiblings('whey-choco', 'proteinas');

    expect(urlOf(spy, 0)).toBe('http://api.test/products');
    expect(urlOf(spy, 1)).toBe('http://api.test/products/whey-choco');
    expect(urlOf(spy, 2)).toBe('http://api.test/products?cat=proteinas');
    expect(urlOf(spy, 3)).toBe('http://api.test/products/whey-choco/siblings');
  });

  it('translates the "all" sentinel to an unfiltered GET /products', async () => {
    const spy = stubFetch();
    await new ProductHttpDatasource().getByCategory('all');

    // Sin ?cat=all: el backend no conoce esa categoría y devolvería vacío.
    expect(urlOf(spy)).toBe('http://api.test/products');
  });

  it('getById returns null on a 404, same contract as the mock', async () => {
    stubFetch(404);
    await expect(new ProductHttpDatasource().getById('no-existe')).resolves.toBeNull();
  });
});
