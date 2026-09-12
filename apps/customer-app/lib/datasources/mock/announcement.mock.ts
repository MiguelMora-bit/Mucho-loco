import type { Announcement } from '@mucho-loco/types';
import { ANNOUNCEMENTS } from '../../data';
import { delay } from './delay';
import type { IAnnouncementRepository } from '../../repositories/announcement.repository';

export class AnnouncementMockDatasource implements IAnnouncementRepository {
  async getAll(): Promise<Announcement[]> {
    await delay(150);
    return ANNOUNCEMENTS;
  }
}
