import type { MembershipTier } from '@mucho-loco/types';
import { MembershipMockDatasource } from '../datasources/mock/membership.mock';

export interface IMembershipRepository {
  getTiers(): Promise<MembershipTier[]>;
}

// Swap this line to plug in a real API datasource
export const membershipRepository: IMembershipRepository = new MembershipMockDatasource();
