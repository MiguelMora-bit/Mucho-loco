import type { Announcement } from '@mucho-loco/types';
import { ANNOUNCEMENTS } from '../../data';
import { delay } from './delay';

export class AnnouncementMockDatasource {
  async getAll(): Promise<Announcement[]> {
    await delay(150);
    return ANNOUNCEMENTS;
  }
}
