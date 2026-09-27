import type { CashShiftAudit, ShiftTransaction } from '@mucho-loco/types';
import { CashAuditMockDatasource } from '../datasources/mock/cashAudit.mock';
import { CashAuditHttpDatasource } from '../datasources/http/cashAudit.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

/** Auditoría de cortes de caja de las 15 sucursales (spec 052). */
export interface ICashAuditRepository {
  /** Cortes cerrados en el mes `YYYY-MM` de CDMX (de una sucursal, si se pide), el cierre más reciente primero. */
  getShifts(month: string, branchId?: number): Promise<CashShiftAudit[]>;
  /** Lo que entró al cajón en ese turno, para el detalle. */
  getTransactions(shiftId: string): Promise<ShiftTransaction[]>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const cashAuditRepository: ICashAuditRepository = isHttpDatasourceEnabled()
  ? new CashAuditHttpDatasource()
  : new CashAuditMockDatasource();
