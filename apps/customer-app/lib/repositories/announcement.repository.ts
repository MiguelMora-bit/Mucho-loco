import type { Announcement } from '@mucho-loco/types';
import { AnnouncementMockDatasource } from '../datasources/mock/announcement.mock';

export interface IAnnouncementRepository {
  getAll(): Promise<Announcement[]>;
}

// Swap this line to plug in a real API datasource
export const announcementRepository: IAnnouncementRepository = new AnnouncementMockDatasource();
