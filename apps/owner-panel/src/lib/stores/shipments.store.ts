import type { ShipmentOrder } from '@mucho-loco/types';
import { createAsyncResourceStore } from './createAsyncResource';
import { shipmentsRepository } from '../repositories/shipments.repository';

export const useShipmentsStore = createAsyncResourceStore<ShipmentOrder[]>(() => shipmentsRepository.getAll());
