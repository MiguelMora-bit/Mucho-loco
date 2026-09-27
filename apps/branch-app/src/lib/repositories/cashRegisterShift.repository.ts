import type { CashRegisterShift, ShiftTransaction } from '@mucho-loco/types';
import { CashRegisterShiftMockDatasource } from '../datasources/mock/cashRegisterShift.mock';
import { CashRegisterShiftHttpDatasource } from '../datasources/http/cashRegisterShift.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export { ShiftNotFoundError, ShiftAlreadyClosedError } from './cashRegisterShift.errors';

export interface ICashRegisterShiftRepository {
  /** El shift 'open' de esa sucursal — se crea uno nuevo si no había ninguno abierto. */
  getOpenShift(branchId: number): Promise<CashRegisterShift>;
  /** Ventas + pagos de membresía de esa sucursal dentro de la ventana del shift, ordenados por fecha. */
  getTransactions(shiftId: string): Promise<ShiftTransaction[]>;
  /** Shifts cerrados de esa sucursal, más reciente primero — el historial auditable. */
  getHistory(branchId: number): Promise<CashRegisterShift[]>;
  /** Cerrar es arquear (spec 052): `countedCash` es el efectivo que el gerente contó.
   *  Congela esperado, contado y quién cerró. No abre el siguiente shift — eso lo
   *  hace getOpenShift() la próxima vez que se pida. */
  closeShift(shiftId: string, countedCash: number): Promise<CashRegisterShift>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const cashRegisterShiftRepository: ICashRegisterShiftRepository = isHttpDatasourceEnabled()
  ? new CashRegisterShiftHttpDatasource()
  : new CashRegisterShiftMockDatasource();
