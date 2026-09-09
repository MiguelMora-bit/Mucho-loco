import type { UserProfile, MembershipInfo, Visit, Order, OrderItem, OnlinePaymentMethod } from '@mucho-loco/types';
import { UserMockDatasource } from '../datasources/mock/user.mock';

export interface IUserRepository {
  getProfile(): Promise<UserProfile>;
  getMembership(): Promise<MembershipInfo>;
  getVisitHistory(): Promise<Visit[]>;
  getOrders(): Promise<Order[]>;
  createOrder(items: OrderItem[], total: number, paymentMethod: OnlinePaymentMethod, delivery: 'pickup' | 'home'): Promise<Order>;
}

export const userRepository: IUserRepository = new UserMockDatasource();
