import { describe, it, expect } from 'vitest';
import { membershipRepository } from './membership.repository';
import { MEMBERSHIP_TIERS } from '../data';

describe('membershipRepository', () => {
  it('getTiers returns every mock tier', async () => {
    const tiers = await membershipRepository.getTiers();
    expect(tiers).toHaveLength(MEMBERSHIP_TIERS.length);
  });

  it('getTiers includes the single-branch and all-branches tiers', async () => {
    const tiers = await membershipRepository.getTiers();
    expect(tiers.map((t) => t.key)).toEqual(expect.arrayContaining(['single', 'all']));
  });
});
