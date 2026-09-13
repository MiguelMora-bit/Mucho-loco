import type { IBranchRepository } from '@mucho-loco/customer-core/contract';
import { BranchHttpDatasource } from '@mucho-loco/customer-core/http';
import { BranchMockDatasource } from '@mucho-loco/customer-core/mock';
import { publicApi } from '../datasources/http/client';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

// El contrato y los datasources viven en @mucho-loco/customer-core (los
// comparte mobile-app); aquí solo se elige cuál y con qué cliente.
export type { IBranchRepository };

// Mock o backend NestJS real, según NEXT_PUBLIC_DATA_SOURCE — ver datasources/http/config.ts.
export const branchRepository: IBranchRepository = isHttpDatasourceEnabled()
  ? new BranchHttpDatasource(publicApi)
  : new BranchMockDatasource();
