import { describe, it, expect, beforeAll } from 'vitest';
import type { Branch, Product } from '@mucho-loco/types';
import { BranchHttpDatasource } from '../../lib/datasources/http/branch.http';
import { ProductHttpDatasource } from '../../lib/datasources/http/product.http';
import { BranchMockDatasource } from '../../lib/datasources/mock/branch.mock';
import { ProductMockDatasource } from '../../lib/datasources/mock/product.mock';
import { requireBackend } from './api-available';

/**
 * Paridad de contrato mock ↔ backend real.
 *
 * La promesa de la metodología contract-first es "solo cambias el datasource".
 * Estos tests la verifican de verdad: el MISMO método, llamado en los dos
 * datasources, tiene que devolver el mismo dato. Si el seed de `apps/backend`
 * se desincroniza de `lib/data.ts`, o si un mapper del backend renombra/pierde
 * un campo, aquí truena — no en producción, cuando un componente lea
 * `branch.promo` y encuentre `null` donde esperaba `undefined`.
 */

const httpBranches = new BranchHttpDatasource();
const httpProducts = new ProductHttpDatasource();
const mockBranches = new BranchMockDatasource();
const mockProducts = new ProductMockDatasource();

/**
 * Los campos opcionales del contrato (`featured?`, `promo?`, `tag?`) se
 * representan distinto en cada lado sin que eso sea una ruptura: el mock
 * omite la llave cuando no aplica, el backend la manda explícita
 * (`featured: false`, y `promo`/`tag` ausentes tras serializar `undefined` a
 * JSON). Un consumidor escribe `branch.featured &&` y no nota la diferencia,
 * así que la comparación se hace sobre una forma canónica — sigue detectando
 * un campo perdido, renombrado o con OTRO valor, que es lo que importa.
 */
const canonicalBranch = (b: Branch) => ({ ...b, featured: b.featured ?? false, promo: b.promo ?? null });
const canonicalProduct = (p: Product) => ({ ...p, tag: p.tag ?? null });

const byId = <T extends { id: number | string }>(rows: T[]) =>
  [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));

beforeAll(requireBackend);

describe('branches: HTTP datasource vs mock', () => {
  it('getAll returns exactly the same 15 branches as the mock', async () => {
    const [http, mock] = await Promise.all([httpBranches.getAll(), mockBranches.getAll()]);

    expect(http).toHaveLength(mock.length);
    expect(byId(http).map(canonicalBranch)).toEqual(byId(mock).map(canonicalBranch));
  });

  it('getById returns a branch identical to the mock, field by field', async () => {
    const [http, mock] = await Promise.all([httpBranches.getById(1), mockBranches.getById(1)]);

    expect(http).not.toBeNull();
    expect(canonicalBranch(http as Branch)).toEqual(canonicalBranch(mock as Branch));
  });

  it('a branch without a promo comes back as undefined, not null', async () => {
    // El contrato de @mucho-loco/types es `promo?: BranchPromo` — la columna
    // Json del backend es nullable, y el mapper tiene que traducir esa
    // diferencia (ver toBranch() en branches.service.ts).
    const branch = (await httpBranches.getById(2)) as Branch;

    expect(branch.promo).toBeUndefined();
  });

  it('getById resolves to null for an unknown id (404 → null)', async () => {
    await expect(httpBranches.getById(9999)).resolves.toBeNull();
  });

  it('getFeatured matches the mock and only returns featured branches', async () => {
    const [http, mock] = await Promise.all([
      httpBranches.getFeatured(),
      mockBranches.getFeatured(),
    ]);

    expect(http.every((b) => b.featured)).toBe(true);
    expect(byId(http).map(canonicalBranch)).toEqual(byId(mock).map(canonicalBranch));
  });
});

describe('products: HTTP datasource vs mock', () => {
  it('getAll returns exactly the same catalog as the mock', async () => {
    const [http, mock] = await Promise.all([httpProducts.getAll(), mockProducts.getAll()]);

    expect(http).toHaveLength(mock.length);
    expect(byId(http).map(canonicalProduct)).toEqual(byId(mock).map(canonicalProduct));
  });

  it('keeps name/flav as LocalizedString objects, not flattened strings', async () => {
    const product = (await httpProducts.getById('p1')) as Product;

    expect(product.name).toEqual(expect.objectContaining({ es: expect.any(String), en: expect.any(String) }));
    expect(product.flav).toEqual(expect.objectContaining({ es: expect.any(String), en: expect.any(String) }));
  });

  it('a product without a tag comes back as undefined, not null', async () => {
    const product = (await httpProducts.getById('p2')) as Product;

    expect(product.tag).toBeUndefined();
  });

  it('getByCategory filters the same way the mock does', async () => {
    const [http, mock] = await Promise.all([
      httpProducts.getByCategory('proteinas'),
      mockProducts.getByCategory('proteinas'),
    ]);

    expect(http.every((p) => p.cat === 'proteinas')).toBe(true);
    expect(byId(http).map(canonicalProduct)).toEqual(byId(mock).map(canonicalProduct));
  });

  it('getByCategory("all") returns the whole catalog, not an empty list', async () => {
    // Regresión del sentinel: ?cat=all consultaría una categoría inexistente.
    const all = await httpProducts.getByCategory('all');

    expect(all).toHaveLength((await mockProducts.getAll()).length);
  });

  it('getSiblings returns same-category products excluding the requested one', async () => {
    const siblings = await httpProducts.getSiblings('p1', 'proteinas');

    expect(siblings.length).toBeGreaterThan(0);
    expect(siblings.every((p) => p.cat === 'proteinas')).toBe(true);
    expect(siblings.some((p) => p.id === 'p1')).toBe(false);
  });

  it('getById resolves to null for an unknown id (404 → null)', async () => {
    await expect(httpProducts.getById('no-existe')).resolves.toBeNull();
  });
});
