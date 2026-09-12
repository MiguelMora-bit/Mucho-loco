import { Controller, Get } from '@nestjs/common';
import type { Announcement } from '@mucho-loco/types';
import { AnnouncementsService } from './announcements.service';
import { Public } from '../auth/public.decorator';

/** Contenido de landing (avisos) — público, igual que branches/products. */
@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcements: AnnouncementsService) {}

  @Public()
  @Get()
  getAll(): Promise<Announcement[]> {
    return this.announcements.getAll();
  }
}
