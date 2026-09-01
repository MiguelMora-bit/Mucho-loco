import { describe, it, expect } from 'vitest';
import { userRepository } from './user.repository';

describe('userRepository', () => {
  it('createOrder adds an order that then shows up in getOrders', async () => {
    const before = await userRepository.getOrders();
    const items = [{ name: 'Test Product', flav: 'Test Flavor', img: '/assets/test.jpg', qty: 2 }];

    const created = await userRepository.createOrder(items, 123);

    expect(created.items).toEqual(items);
    expect(created.total).toBe(123);
    expect(created.status).toBe('ready');
    expect(created.id).toMatch(/^#ML-/);

    const after = await userRepository.getOrders();
    expect(after).toHaveLength(before.length + 1);
    expect(after[0].id).toBe(created.id);
  });
});
