import { describe, it, expect } from 'vitest';
import { productRepository } from './product.repository';
import { PRODUCTS } from '../data';

describe('productRepository', () => {
  it('getAll returns every mock product', async () => {
    const products = await productRepository.getAll();
    expect(products).toHaveLength(PRODUCTS.length);
  });

  it('getById returns the matching product', async () => {
    const product = await productRepository.getById('p7');
    expect(product?.name.es).toBe('Pre-Entreno Bestia');
  });

  it('getById returns null for an unknown id', async () => {
    const product = await productRepository.getById('does-not-exist');
    expect(product).toBeNull();
  });

  it('getByCategory("all") returns every product', async () => {
    const products = await productRepository.getByCategory('all');
    expect(products).toHaveLength(PRODUCTS.length);
  });

  it('getByCategory filters to the requested category', async () => {
    const products = await productRepository.getByCategory('proteinas');
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => p.cat === 'proteinas')).toBe(true);
  });

  it('getSiblings excludes the product itself and caps at 4', async () => {
    const siblings = await productRepository.getSiblings('p2', 'proteinas');
    expect(siblings.find((p) => p.id === 'p2')).toBeUndefined();
    expect(siblings.length).toBeLessThanOrEqual(4);
    expect(siblings.every((p) => p.cat === 'proteinas')).toBe(true);
  });
});
