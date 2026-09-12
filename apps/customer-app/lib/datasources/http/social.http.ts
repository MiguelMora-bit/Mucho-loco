import type { SocialLink, FeedPost } from '../../types/social';
import type { ISocialRepository } from '../../repositories/social.repository';
import { apiGet } from './client';

const SOCIAL_REVALIDATE = 60;

/** Feed de marketing (redes del gym), no el feed interno entre socios — ese es community.http.ts. */
export class SocialHttpDatasource implements ISocialRepository {
  getLinks(): Promise<SocialLink[]> {
    return apiGet<SocialLink[]>('/social/links', { revalidate: SOCIAL_REVALIDATE });
  }

  getFeed(): Promise<FeedPost[]> {
    return apiGet<FeedPost[]>('/social/feed', { revalidate: SOCIAL_REVALIDATE });
  }
}
