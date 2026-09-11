import { describe, it, expect } from 'vitest';
import { counterSaleRepository } from './counterSale.repository';
import { BRANCH_INVENTORY, COUNTER_SALES } from '../data';

describe('counterSaleRepository', () => {
  it('getInventory only returns stock for that branch', async () => {
    const inventory = await counterSaleRepository.getInventory(1);
    expect(inventory).toHaveLength(BRANCH_INVENTORY.filter((i) => i.branchId === 1).length);
  });

  it('createSale decrements local stock by the sold quantity', async () => {
    const before = await counterSaleRepository.getInventory(1);
    const target = before.find((i) => i.qty > 1)!;
    // Capture as a primitive before the sale — getInventory returns live
    // references to the mock array (same convention as every other mock
    // datasource here), so `target` itself mutates once createSale runs.
    const qtyBefore = target.qty;
    await counterSaleRepository.createSale(1, [{ productId: target.productId, qty: 1 }], 'cash');
    const after = await counterSaleRepository.getInventory(1);
    const updated = after.find((i) => i.productId === target.productId)!;
    expect(updated.qty).toBe(qtyBefore - 1);
  });

  it('createSale rejects when stock is insufficient', async () => {
    const inventory = await counterSaleRepository.getInventory(1);
    const outOfStock = inventory.find((i) => i.qty === 0)!;
    await expect(
      counterSaleRepository.createSale(1, [{ productId: outOfStock.productId, qty: 1 }], 'cash')
    ).rejects.toThrow();
  });

  it('createSale rejects an unknown product', async () => {
    await expect(counterSaleRepository.createSale(1, [{ productId: 'nope', qty: 1 }], 'card')).rejects.toThrow();
  });

  it('createSale persists the sale to history — needed for the cash register shift to sum it up', async () => {
    const inventory = await counterSaleRepository.getInventory(1);
    const target = inventory.find((i) => i.qty > 1)!;
    const sale = await counterSaleRepository.createSale(1, [{ productId: target.productId, qty: 1 }], 'cash');
    expect(COUNTER_SALES).toContainEqual(sale);
  });
});
