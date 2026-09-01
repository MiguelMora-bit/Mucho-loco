import type { SocialLink, FeedPost } from '../types/social';
import { SocialMockDatasource } from '../datasources/mock/social.mock';

export interface ISocialRepository {
  getLinks(): Promise<SocialLink[]>;
  getFeed(): Promise<FeedPost[]>;
}

// Swap this line to plug in a real API datasource
export const socialRepository: ISocialRepository = new SocialMockDatasource();
