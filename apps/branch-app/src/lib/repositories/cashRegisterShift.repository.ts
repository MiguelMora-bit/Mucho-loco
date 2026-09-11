import type { CashRegisterShift, ShiftTransaction } from '@mucho-loco/types';
import { CashRegisterShiftMockDatasource } from '../datasources/mock/cashRegisterShift.mock';

export { ShiftNotFoundError, ShiftAlreadyClosedError } from './cashRegisterShift.errors';

export interface ICashRegisterShiftRepository {
  /** El shift 'open' de esa sucursal — se crea uno nuevo si no había ninguno abierto. */
  getOpenShift(branchId: number): Promise<CashRegisterShift>;
  /** Ventas + pagos de membresía de esa sucursal dentro de la ventana del shift, ordenados por fecha. */
  getTransactions(shiftId: string): Promise<ShiftTransaction[]>;
  /** Shifts cerrados de esa sucursal, más reciente primero — el historial auditable. */
  getHistory(branchId: number): Promise<CashRegisterShift[]>;
  /** No abre el siguiente shift — eso lo hace getOpenShift() la próxima vez que se pida. */
  closeShift(shiftId: string): Promise<CashRegisterShift>;
}

// Swap this line to plug in a real API datasource
export const cashRegisterShiftRepository: ICashRegisterShiftRepository = new CashRegisterShiftMockDatasource();
