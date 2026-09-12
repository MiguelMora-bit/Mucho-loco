import type { BranchInventoryLevel, InventoryTransfer } from '@mucho-loco/types';
import { BRANCH_INVENTORY, BRANCH_STATS, INVENTORY_TRANSFERS } from '../../data';
import { delay } from './delay';
import { InsufficientStockError, SameBranchError } from '../../repositories/inventoryTransfer.errors';
import type { IInventoryTransferRepository } from '../../repositories/inventoryTransfer.repository';

export interface CreateTransferInput {
  productId: string;
  fromBranchId: number;
  toBranchId: number;
  qty: number;
}

export class InventoryTransferMockDatasource implements IInventoryTransferRepository {
  async getBranchInventory(): Promise<BranchInventoryLevel[]> {
    await delay(150);
    return BRANCH_INVENTORY;
  }

  async getAll(): Promise<InventoryTransfer[]> {
    await delay(150);
    return INVENTORY_TRANSFERS;
  }

  async create(input: CreateTransferInput): Promise<InventoryTransfer> {
    await delay(220);
    if (input.fromBranchId === input.toBranchId) throw new SameBranchError();

    const source = BRANCH_INVENTORY.find((i) => i.branchId === input.fromBranchId && i.productId === input.productId);
    if (!source || source.qty < input.qty) throw new InsufficientStockError(source?.productName ?? input.productId);

    source.qty -= input.qty;

    // Destination branch may not stock this product yet — open a new level
    // for it there instead of requiring every branch to carry every SKU.
    let destination = BRANCH_INVENTORY.find((i) => i.branchId === input.toBranchId && i.productId === input.productId);
    if (destination) {
      destination.qty += input.qty;
    } else {
      destination = { branchId: input.toBranchId, productId: source.productId, productName: source.productName, unitPrice: source.unitPrice, qty: input.qty };
      BRANCH_INVENTORY.push(destination);
    }

    const fromBranchName = BRANCH_STATS.find((b) => b.branchId === input.fromBranchId)?.branchName ?? `#${input.fromBranchId}`;
    const toBranchName = BRANCH_STATS.find((b) => b.branchId === input.toBranchId)?.branchName ?? `#${input.toBranchId}`;

    const transfer: InventoryTransfer = {
      id: `transfer-${Date.now()}`,
      productId: source.productId,
      productName: source.productName,
      fromBranchId: input.fromBranchId,
      fromBranchName,
      toBranchId: input.toBranchId,
      toBranchName,
      qty: input.qty,
      createdAt: new Date().toISOString(),
    };
    INVENTORY_TRANSFERS.push(transfer);
    return transfer;
  }
}
