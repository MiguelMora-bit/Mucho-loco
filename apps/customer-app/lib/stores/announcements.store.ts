import type { Announcement } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { announcementRepository } from '../repositories/announcement.repository';

export const useAnnouncementsStore = createAsyncResourceStore<Announcement[]>(() =>
  announcementRepository.getAll()
);
