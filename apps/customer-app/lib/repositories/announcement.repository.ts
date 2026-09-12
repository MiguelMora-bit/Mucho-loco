import type { Announcement } from '@mucho-loco/types';
import { AnnouncementMockDatasource } from '../datasources/mock/announcement.mock';
import { AnnouncementHttpDatasource } from '../datasources/http/announcement.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IAnnouncementRepository {
  getAll(): Promise<Announcement[]>;
}

export const announcementRepository: IAnnouncementRepository = isHttpDatasourceEnabled()
  ? new AnnouncementHttpDatasource()
  : new AnnouncementMockDatasource();
