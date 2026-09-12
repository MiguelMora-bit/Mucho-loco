import type { BranchStatsSummary, GlobalInventoryItem } from '@mucho-loco/types';
import type { IStatsRepository } from '../../repositories/stats.repository';
import { api } from './client';

/**
 * Tablero de solo lectura del dueño.
 *
 * Los dos números que devuelve ahora son DERIVADOS de transacciones reales, no
 * las cuatro filas escritas a mano que traía `BRANCH_STATS` (con
 * `revenue: 186400` fijo). Consecuencia esperada: contra una base recién
 * sembrada los importes son chicos — es el precio de que sean ciertos.
 */
export class StatsHttpDatasource implements IStatsRepository {
  getBranchStats(): Promise<BranchStatsSummary[]> {
    return api.get<BranchStatsSummary[]>('/stats/branches');
  }

  getGlobalInventory(): Promise<GlobalInventoryItem[]> {
    return api.get<GlobalInventoryItem[]>('/inventory/global');
  }
}
