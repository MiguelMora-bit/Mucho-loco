import type { MembershipTier } from '@mucho-loco/types';
import { MEMBERSHIP_TIERS } from '../data';
import { delay } from './delay';
import type { IMembershipRepository } from '../contract';

export class MembershipMockDatasource implements IMembershipRepository {
  async getTiers(): Promise<MembershipTier[]> {
    await delay(140);
    return MEMBERSHIP_TIERS;
  }
}
