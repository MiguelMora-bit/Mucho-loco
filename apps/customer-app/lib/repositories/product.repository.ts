import type { IProductRepository } from '@mucho-loco/customer-core/contract';
import { ProductHttpDatasource } from '@mucho-loco/customer-core/http';
import { ProductMockDatasource } from '@mucho-loco/customer-core/mock';
import { publicApi } from '../datasources/http/client';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

// El contrato y los datasources viven en @mucho-loco/customer-core (los
// comparte mobile-app); aquí solo se elige cuál y con qué cliente.
export type { IProductRepository };

export const productRepository: IProductRepository = isHttpDatasourceEnabled()
  ? new ProductHttpDatasource(publicApi)
  : new ProductMockDatasource();
