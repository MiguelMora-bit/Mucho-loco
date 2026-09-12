import type { Product } from '@mucho-loco/types';
import { ProductMockDatasource } from '../datasources/mock/product.mock';
import { ProductHttpDatasource } from '../datasources/http/product.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IProductRepository {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getByCategory(cat: string): Promise<Product[]>;
  getSiblings(id: string, cat: string): Promise<Product[]>;
}

export const productRepository: IProductRepository = isHttpDatasourceEnabled()
  ? new ProductHttpDatasource()
  : new ProductMockDatasource();
