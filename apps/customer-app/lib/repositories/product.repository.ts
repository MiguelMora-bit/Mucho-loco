import type { Product } from '@mucho-loco/types';
import { ProductMockDatasource } from '../datasources/mock/product.mock';

export interface IProductRepository {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getByCategory(cat: string): Promise<Product[]>;
  getSiblings(id: string, cat: string): Promise<Product[]>;
}

export const productRepository: IProductRepository = new ProductMockDatasource();
