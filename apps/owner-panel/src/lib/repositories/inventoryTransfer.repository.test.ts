import { describe, it, expect } from 'vitest';
import { inventoryTransferRepository } from './inventoryTransfer.repository';
import { BRANCH_INVENTORY } from '../data';

describe('inventoryTransferRepository', () => {
  it('create moves qty from the source branch to the destination branch', async () => {
    const before = await inventoryTransferRepository.getBranchInventory();
    const source = before.find((i) => i.branchId === 1 && i.qty > 1)!;
    const qtyBefore = source.qty;

    const transfer = await inventoryTransferRepository.create({
      productId: source.productId,
      fromBranchId: 1,
      toBranchId: 2,
      qty: 1,
    });

    const after = await inventoryTransferRepository.getBranchInventory();
    const updatedSource = after.find((i) => i.branchId === 1 && i.productId === source.productId)!;
    const updatedDestination = after.find((i) => i.branchId === 2 && i.productId === source.productId)!;

    expect(updatedSource.qty).toBe(qtyBefore - 1);
    expect(updatedDestination.qty).toBeGreaterThanOrEqual(1);
    expect(transfer.fromBranchId).toBe(1);
    expect(transfer.toBranchId).toBe(2);
    expect(transfer.qty).toBe(1);
  });

  it('create opens a new level at the destination when it does not stock the product yet', async () => {
    // branchId 3 seeds no 'p1' level in the fixture — verifies the "no
    // existing level at destination" branch of the mutation, not just the
    // "increment existing level" one covered above.
    const hasP1AtBranch3 = BRANCH_INVENTORY.some((i) => i.branchId === 3 && i.productId === 'p1');
    expect(hasP1AtBranch3).toBe(false);

    await inventoryTransferRepository.create({ productId: 'p1', fromBranchId: 1, toBranchId: 3, qty: 2 });

    const after = await inventoryTransferRepository.getBranchInventory();
    const created = after.find((i) => i.branchId === 3 && i.productId === 'p1');
    expect(created?.qty).toBe(2);
  });

  it('create rejects when the source branch lacks enough stock', async () => {
    const before = await inventoryTransferRepository.getBranchInventory();
    const source = before.find((i) => i.branchId === 1)!;
    await expect(
      inventoryTransferRepository.create({ productId: source.productId, fromBranchId: 1, toBranchId: 2, qty: source.qty + 1000 })
    ).rejects.toThrow();
  });

  it('create rejects when source and destination branch are the same', async () => {
    await expect(
      inventoryTransferRepository.create({ productId: 'p1', fromBranchId: 1, toBranchId: 1, qty: 1 })
    ).rejects.toThrow();
  });

  it('getAll returns every mock transfer row', async () => {
    const transfers = await inventoryTransferRepository.getAll();
    expect(transfers.length).toBeGreaterThan(0);
  });
});
