import type { BranchInventoryLevel, InventoryTransfer } from '@mucho-loco/types';
import type { IInventoryTransferRepository } from '../../repositories/inventoryTransfer.repository';
import type { CreateTransferInput } from '../../datasources/mock/inventoryTransfer.mock';
import {
  InsufficientStockError,
  SameBranchError,
} from '../../repositories/inventoryTransfer.errors';
import { ApiRequestError, api } from './client';

/** Traduce el código del backend al error tipado que promete el contrato. */
function toDomainError(e: unknown): unknown {
  if (!(e instanceof ApiRequestError)) return e;
  switch (e.code) {
    case 'SAME_BRANCH_TRANSFER':
      return new SameBranchError();
    case 'INSUFFICIENT_STOCK':
      return new InsufficientStockError(String(e.body.productName ?? e.body.productId ?? ''));
    case 'BRANCH_DOES_NOT_STOCK_PRODUCT':
      // La sucursal origen no maneja ese producto: para HQ es el mismo
      // problema que no tener suficiente — no hay de dónde sacarlo.
      return new InsufficientStockError(String(e.body.productId ?? ''));
    default:
      return e;
  }
}

export class InventoryTransferHttpDatasource implements IInventoryTransferRepository {
  /** Niveles de TODAS las sucursales — de ahí sale el selector de origen/destino. */
  getBranchInventory(): Promise<BranchInventoryLevel[]> {
    return api.get<BranchInventoryLevel[]>('/inventory');
  }

  getAll(): Promise<InventoryTransfer[]> {
    return api.get<InventoryTransfer[]>('/inventory/transfers');
  }

  /**
   * El backend descuenta del origen, suma al destino y registra el movimiento
   * en UNA transacción de base de datos. El mock mutaba dos arreglos y podía
   * quedarse a medias.
   */
  async create(input: CreateTransferInput): Promise<InventoryTransfer> {
    try {
      return await api.post<InventoryTransfer>('/inventory/transfers', input);
    } catch (e) {
      throw toDomainError(e);
    }
  }
}
