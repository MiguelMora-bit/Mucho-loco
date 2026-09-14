import type { IMembershipRepository } from '@mucho-loco/customer-core/contract';
import { MembershipHttpDatasource } from '@mucho-loco/customer-core/http';
import { MembershipMockDatasource } from '@mucho-loco/customer-core/mock';
import { publicApi } from '../datasources/http/client';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

// El contrato y los datasources viven en @mucho-loco/customer-core (los
// comparte mobile-app); aquí solo se elige cuál y con qué cliente.
export type { IMembershipRepository };

export const membershipRepository: IMembershipRepository = isHttpDatasourceEnabled()
  ? new MembershipHttpDatasource(publicApi)
  : new MembershipMockDatasource();
