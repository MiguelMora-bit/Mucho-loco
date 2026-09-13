import type { SocialLink, FeedPost } from '@mucho-loco/types';
import { SOCIAL_LINKS, SOCIAL_FEED } from '../data';
import { delay } from './delay';
import type { ISocialRepository } from '../contract';

export class SocialMockDatasource implements ISocialRepository {
  async getLinks(): Promise<SocialLink[]> {
    await delay(120);
    return SOCIAL_LINKS;
  }

  async getFeed(): Promise<FeedPost[]> {
    await delay(200);
    return SOCIAL_FEED;
  }
}
