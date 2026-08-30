import type { UserProfile, MembershipInfo, Visit, Order } from '@mucho-loco/types';
import { UserMockDatasource } from '../datasources/mock/user.mock';

export interface IUserRepository {
  getProfile(): Promise<UserProfile>;
  getMembership(): Promise<MembershipInfo>;
  getVisitHistory(): Promise<Visit[]>;
  getOrders(): Promise<Order[]>;
}

export const userRepository: IUserRepository = new UserMockDatasource();
