import { Injectable } from '@nestjs/common';
import type { FeedPost, LocalizedString, SocialLink } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type {
  SocialLink as SocialLinkRow,
  SocialFeedPost as SocialFeedPostRow,
} from '@prisma/client';

function toSocialLink(row: SocialLinkRow): SocialLink {
  return {
    key: row.key,
    name: row.name,
    handle: row.handle,
    followers: row.followers,
    url: row.url,
  };
}

function toFeedPost(row: SocialFeedPostRow): FeedPost {
  return {
    net: row.net,
    img: row.img,
    cap: row.cap as LocalizedString,
    likes: row.likes,
    ago: row.ago,
    url: row.url,
  };
}

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async getLinks(): Promise<SocialLink[]> {
    // Orden del enum (instagram, tiktok, youtube, facebook), no el físico de las filas.
    const rows = await this.prisma.socialLink.findMany({ orderBy: { key: 'asc' } });
    return rows.map(toSocialLink);
  }

  async getFeed(): Promise<FeedPost[]> {
    const rows = await this.prisma.socialFeedPost.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toFeedPost);
  }
}
