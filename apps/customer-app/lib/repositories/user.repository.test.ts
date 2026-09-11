import { describe, it, expect } from 'vitest';
import { userRepository } from './user.repository';
import { ALL_GYMS_TEST_EMAIL, SINGLE_GYM_TEST_EMAIL } from '../datasources/mock/user.mock';

describe('userRepository', () => {
  it('createOrder adds an order that then shows up in getOrders', async () => {
    const before = await userRepository.getOrders(ALL_GYMS_TEST_EMAIL);
    const items = [{ name: 'Test Product', flav: 'Test Flavor', img: '/assets/test.jpg', qty: 2 }];

    const created = await userRepository.createOrder(ALL_GYMS_TEST_EMAIL, items, 123, 'card', 'pickup');

    expect(created.items).toEqual(items);
    expect(created.total).toBe(123);
    expect(created.status).toBe('ready');
    expect(created.id).toMatch(/^#ML-/);
    expect(created.paymentMethod).toBe('card');
    expect(created.delivery).toBe('pickup');
    expect(created.branch).toBeTruthy();

    const after = await userRepository.getOrders(ALL_GYMS_TEST_EMAIL);
    expect(after).toHaveLength(before.length + 1);
    expect(after[0].id).toBe(created.id);
  });

  it('gives the single-gym test user a membership scoped to one branch', async () => {
    const membership = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);
    expect(membership.tierKey).toBe('single');
    expect(membership.branch).toBe('Condesa');

    const history = await userRepository.getVisitHistory(SINGLE_GYM_TEST_EMAIL);
    expect(history.every((v) => v.branch === 'Condesa')).toBe(true);
  });

  it('gives the all-gyms test user a membership scoped to every branch', async () => {
    const membership = await userRepository.getMembership(ALL_GYMS_TEST_EMAIL);
    expect(membership.tierKey).toBe('all');
  });

  it('seeds the single-gym test user in a failed-payment grace period', async () => {
    const membership = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);
    expect(membership.status).toBe('grace');
    expect(membership.graceEndsAt).toBeTruthy();
  });

  it('retryMembershipPayment clears grace/expired status and extends access', async () => {
    const updated = await userRepository.retryMembershipPayment(SINGLE_GYM_TEST_EMAIL);
    expect(updated.status).toBe('active');
    expect(updated.graceEndsAt).toBeNull();
    expect(updated.daysLeft).toBe(30);

    const persisted = await userRepository.getMembership(SINGLE_GYM_TEST_EMAIL);
    expect(persisted.status).toBe('active');
  });
});
