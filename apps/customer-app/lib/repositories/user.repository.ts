import type { UserProfile, MembershipInfo, Visit, Order, OrderItem, OnlinePaymentMethod } from '@mucho-loco/types';
import { UserMockDatasource } from '../datasources/mock/user.mock';

export interface IUserRepository {
  getProfile(email: string): Promise<UserProfile>;
  getMembership(email: string): Promise<MembershipInfo>;
  getVisitHistory(email: string): Promise<Visit[]>;
  getOrders(email: string): Promise<Order[]>;
  createOrder(email: string, items: OrderItem[], total: number, paymentMethod: OnlinePaymentMethod, delivery: 'pickup' | 'home'): Promise<Order>;
}

export const userRepository: IUserRepository = new UserMockDatasource();
