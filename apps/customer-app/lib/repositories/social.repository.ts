import type { SocialLink, FeedPost } from '../types/social';
import { SocialMockDatasource } from '../datasources/mock/social.mock';
import { SocialHttpDatasource } from '../datasources/http/social.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface ISocialRepository {
  getLinks(): Promise<SocialLink[]>;
  getFeed(): Promise<FeedPost[]>;
}

export const socialRepository: ISocialRepository = isHttpDatasourceEnabled()
  ? new SocialHttpDatasource()
  : new SocialMockDatasource();
