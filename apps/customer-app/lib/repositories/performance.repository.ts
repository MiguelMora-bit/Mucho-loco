import type { IPerformanceRepository } from '@mucho-loco/customer-core/contract';
import { PerformanceHttpDatasource } from '@mucho-loco/customer-core/http';
import { PerformanceMockDatasource } from '@mucho-loco/customer-core/mock';
import { accountApi } from '../datasources/http/account-client';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

// El contrato y los datasources viven en @mucho-loco/customer-core (los
// comparte mobile-app); aquí solo se elige cuál y con qué cliente. Cuenta =
// `accountApi`: solo servidor, lee la cookie ml_session.
export type { IPerformanceRepository };

export const performanceRepository: IPerformanceRepository = isHttpDatasourceEnabled()
  ? new PerformanceHttpDatasource(accountApi)
  : new PerformanceMockDatasource();
