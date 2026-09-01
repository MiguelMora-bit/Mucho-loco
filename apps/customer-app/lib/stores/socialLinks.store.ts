import { createAsyncResourceStore } from './createAsyncResource';
import { socialRepository } from '../repositories/social.repository';
import type { SocialLink } from '../types/social';

export const useSocialLinksStore = createAsyncResourceStore<SocialLink[]>(() =>
  socialRepository.getLinks()
);
