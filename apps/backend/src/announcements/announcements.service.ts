import { Injectable } from '@nestjs/common';
import type { Announcement, LocalizedString } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Announcement as AnnouncementRow } from '@prisma/client';

function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    type: row.type,
    badge: row.badge as LocalizedString,
    date: row.date.toISOString().slice(0, 10),
    dateLabel: row.dateLabel as LocalizedString,
    title: row.title as LocalizedString,
    subtitle: row.subtitle as LocalizedString,
    body: row.body as LocalizedString,
    cta: row.cta as LocalizedString,
    link: row.link ?? undefined,
    location: row.location as LocalizedString,
    emoji: row.emoji,
    accent: row.accent,
  };
}

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Announcement[]> {
    const rows = await this.prisma.announcement.findMany({
      orderBy: { date: 'asc' },
    });
    return rows.map(toAnnouncement);
  }
}
