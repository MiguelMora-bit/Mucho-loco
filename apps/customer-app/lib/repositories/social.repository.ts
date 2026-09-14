import type { ISocialRepository } from '@mucho-loco/customer-core/contract';
import { SocialHttpDatasource } from '@mucho-loco/customer-core/http';
import { SocialMockDatasource } from '@mucho-loco/customer-core/mock';
import { publicApi } from '../datasources/http/client';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

// El contrato y los datasources viven en @mucho-loco/customer-core (los
// comparte mobile-app); aquí solo se elige cuál y con qué cliente.
export type { ISocialRepository };

export const socialRepository: ISocialRepository = isHttpDatasourceEnabled()
  ? new SocialHttpDatasource(publicApi)
  : new SocialMockDatasource();
