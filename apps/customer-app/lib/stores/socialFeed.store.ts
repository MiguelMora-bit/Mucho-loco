import { createAsyncResourceStore } from './createAsyncResource';
import { socialRepository } from '../repositories/social.repository';
import type { FeedPost } from '../types/social';

export const useSocialFeedStore = createAsyncResourceStore<FeedPost[]>(() =>
  socialRepository.getFeed()
);
