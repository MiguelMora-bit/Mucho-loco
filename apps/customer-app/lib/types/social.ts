import type { LocalizedString } from '@mucho-loco/types';

export type SocialNetwork = 'instagram' | 'tiktok' | 'youtube' | 'facebook';

export interface SocialLink {
  key: SocialNetwork;
  name: string;
  handle: string;
  followers: string;
  url: string;
}

export interface FeedPost {
  net: SocialNetwork;
  img: string;
  cap: LocalizedString;
  likes: string;
  ago: string;
  url: string;
}
