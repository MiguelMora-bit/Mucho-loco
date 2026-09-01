import { describe, it, expect } from 'vitest';
import { socialRepository } from './social.repository';
import { SOCIAL_LINKS, SOCIAL_FEED } from '../data';

describe('socialRepository', () => {
  it('getLinks returns every mock social link', async () => {
    const links = await socialRepository.getLinks();
    expect(links).toHaveLength(SOCIAL_LINKS.length);
  });

  it('getFeed returns every mock feed post', async () => {
    const feed = await socialRepository.getFeed();
    expect(feed).toHaveLength(SOCIAL_FEED.length);
  });
});
