import type { MembershipTier } from '@mucho-loco/types';
import { MembershipMockDatasource } from '../datasources/mock/membership.mock';
import { MembershipHttpDatasource } from '../datasources/http/membership.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface IMembershipRepository {
  getTiers(): Promise<MembershipTier[]>;
}

export const membershipRepository: IMembershipRepository = isHttpDatasourceEnabled()
  ? new MembershipHttpDatasource()
  : new MembershipMockDatasource();
