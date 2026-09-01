import type { Product } from '@mucho-loco/types';
import { PRODUCTS } from '../../data';
import { delay } from './delay';

export class ProductMockDatasource {
  async getAll(): Promise<Product[]> {
    await delay(180);
    return PRODUCTS;
  }

  async getById(id: string): Promise<Product | null> {
    await delay(80);
    return PRODUCTS.find((p) => p.id === id) ?? null;
  }

  async getByCategory(cat: string): Promise<Product[]> {
    await delay(120);
    return cat === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.cat === cat);
  }

  async getSiblings(id: string, cat: string): Promise<Product[]> {
    await delay(100);
    return PRODUCTS.filter((p) => p.cat === cat && p.id !== id).slice(0, 4);
  }
}
