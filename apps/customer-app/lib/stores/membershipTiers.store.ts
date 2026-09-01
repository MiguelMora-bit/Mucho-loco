import type { MembershipTier } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { membershipRepository } from '../repositories/membership.repository';

export const useMembershipTiersStore = createAsyncResourceStore<MembershipTier[]>(() =>
  membershipRepository.getTiers()
);
