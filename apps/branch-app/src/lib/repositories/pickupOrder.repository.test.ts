import { describe, it, expect } from 'vitest';
import { pickupOrderRepository } from './pickupOrder.repository';
import { PICKUP_ORDERS } from '../data';

describe('pickupOrderRepository', () => {
  it('getByBranch only returns orders for that branch', async () => {
    const orders = await pickupOrderRepository.getByBranch(1);
    expect(orders).toHaveLength(PICKUP_ORDERS.filter((o) => o.branchId === 1).length);
    expect(orders.every((o) => o.branchId === 1)).toBe(true);
  });

  it('getByBranch returns nothing for an unknown branch', async () => {
    const orders = await pickupOrderRepository.getByBranch(999);
    expect(orders).toHaveLength(0);
  });

  it('markDelivered flips the order status', async () => {
    const [first] = await pickupOrderRepository.getByBranch(1);
    const updated = await pickupOrderRepository.markDelivered(first.id);
    expect(updated.status).toBe('delivered');
  });

  it('markDelivered throws for an unknown order id', async () => {
    await expect(pickupOrderRepository.markDelivered('nope')).rejects.toThrow();
  });
});
