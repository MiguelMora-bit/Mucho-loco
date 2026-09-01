import type { SocialLink, FeedPost } from '../../types/social';
import { SOCIAL_LINKS, SOCIAL_FEED } from '../../data';
import { delay } from './delay';

export class SocialMockDatasource {
  async getLinks(): Promise<SocialLink[]> {
    await delay(120);
    return SOCIAL_LINKS;
  }

  async getFeed(): Promise<FeedPost[]> {
    await delay(200);
    return SOCIAL_FEED;
  }
}
