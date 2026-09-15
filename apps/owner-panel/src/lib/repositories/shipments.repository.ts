import type { ShipmentOrder } from '@mucho-loco/types';
import { ShipmentsMockDatasource } from '../datasources/mock/shipments.mock';
import { ShipmentsHttpDatasource } from '../datasources/http/shipments.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export { ShipmentStateError } from './shipments.errors';
export type { ShipmentStateReason } from './shipments.errors';

/** Envíos a domicilio desde la bodega central. */
export interface IShipmentsRepository {
  /** Pedidos a domicilio ya cobrados, el más viejo primero. */
  getAll(): Promise<ShipmentOrder[]>;
  /** Se entregó a la paquetería. La guía es opcional. */
  markShipped(orderId: string, trackingNumber?: string): Promise<ShipmentOrder>;
  markDelivered(orderId: string): Promise<ShipmentOrder>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const shipmentsRepository: IShipmentsRepository = isHttpDatasourceEnabled()
  ? new ShipmentsHttpDatasource()
  : new ShipmentsMockDatasource();
