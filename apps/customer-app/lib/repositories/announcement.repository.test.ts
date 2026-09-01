import { describe, it, expect } from 'vitest';
import { announcementRepository } from './announcement.repository';
import { ANNOUNCEMENTS } from '../data';

describe('announcementRepository', () => {
  it('getAll returns every mock announcement', async () => {
    const announcements = await announcementRepository.getAll();
    expect(announcements).toHaveLength(ANNOUNCEMENTS.length);
  });

  it('getAll returns announcements with both locales on every field', async () => {
    const announcements = await announcementRepository.getAll();
    for (const a of announcements) {
      expect(a.title.es).toBeTruthy();
      expect(a.title.en).toBeTruthy();
    }
  });
});
