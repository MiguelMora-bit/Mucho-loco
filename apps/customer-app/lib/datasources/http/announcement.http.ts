import type { Announcement } from '@mucho-loco/types';
import type { IAnnouncementRepository } from '../../repositories/announcement.repository';
import { apiGet } from './client';

/** Contenido de landing: cambia poco, se revalida cada minuto (más seguido que
 *  el catálogo — un aviso nuevo debe salir pronto). */
const ANNOUNCEMENTS_REVALIDATE = 60;

export class AnnouncementHttpDatasource implements IAnnouncementRepository {
  getAll(): Promise<Announcement[]> {
    return apiGet<Announcement[]>('/announcements', { revalidate: ANNOUNCEMENTS_REVALIDATE });
  }
}
