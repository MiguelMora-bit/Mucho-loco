import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import type { CashRegisterShift, ShiftTransaction } from '@mucho-loco/types';
import { CashRegisterService } from './cash-register.service';
import { Roles } from '../auth/roles.decorator';

/**
 * Corte de caja. Mostrador puede abrir turno y ver lo que lleva; CERRAR el
 * turno es del gerente — es el momento en que se cuadra el cajón y el corte
 * queda congelado para auditoría (ver "Roles en sucursal" en el CLAUDE.md
 * raíz).
 */
@Controller()
export class CashRegisterController {
  constructor(private cashRegister: CashRegisterService) {}

  @Roles('staff')
  @Get('branches/:branchId/cash-register/open-shift')
  getOpenShift(@Param('branchId', ParseIntPipe) branchId: number): Promise<CashRegisterShift> {
    return this.cashRegister.getOpenShift(branchId);
  }

  @Roles('staff')
  @Get('cash-register/shifts/:shiftId/transactions')
  getTransactions(@Param('shiftId') shiftId: string): Promise<ShiftTransaction[]> {
    return this.cashRegister.getTransactions(shiftId);
  }

  @Roles('manager')
  @Get('branches/:branchId/cash-register/history')
  getHistory(@Param('branchId', ParseIntPipe) branchId: number): Promise<CashRegisterShift[]> {
    return this.cashRegister.getHistory(branchId);
  }

  @Roles('manager')
  @Post('cash-register/shifts/:shiftId/close')
  closeShift(@Param('shiftId') shiftId: string): Promise<CashRegisterShift> {
    return this.cashRegister.closeShift(shiftId);
  }
}
