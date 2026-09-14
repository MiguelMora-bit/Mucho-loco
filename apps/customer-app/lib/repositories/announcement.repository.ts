import type { IAnnouncementRepository } from '@mucho-loco/customer-core/contract';
import { AnnouncementHttpDatasource } from '@mucho-loco/customer-core/http';
import { AnnouncementMockDatasource } from '@mucho-loco/customer-core/mock';
import { publicApi } from '../datasources/http/client';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

// El contrato y los datasources viven en @mucho-loco/customer-core (los
// comparte mobile-app); aquí solo se elige cuál y con qué cliente.
export type { IAnnouncementRepository };

export const announcementRepository: IAnnouncementRepository = isHttpDatasourceEnabled()
  ? new AnnouncementHttpDatasource(publicApi)
  : new AnnouncementMockDatasource();
