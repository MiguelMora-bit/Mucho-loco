import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { CashRegisterShift, CashShiftAudit, ShiftTransaction } from '@mucho-loco/types';
import { CashRegisterService } from './cash-register.service';
import { CloseShiftDto } from './dto/close-shift.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { IdTokenClaims } from '../auth/cognito';
import { mexicoMonthRange } from '../invoicing/fiscal-mapping';

/**
 * Corte de caja. Mostrador puede abrir turno y ver lo que lleva; CERRAR el
 * turno es del gerente — es el momento en que se cuadra el cajón y el corte
 * queda congelado para auditoría (ver "Roles en sucursal" en el CLAUDE.md
 * raíz). HQ audita los cortes de las 15 sucursales (spec 052).
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
  closeShift(
    @Param('shiftId') shiftId: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: IdTokenClaims,
  ): Promise<CashRegisterShift> {
    return this.cashRegister.closeShift(shiftId, dto.countedCash, user);
  }

  /** `?month=YYYY-MM` (hora de CDMX), obligatorio; `?branchId=` opcional. */
  @Roles('owner')
  @Get('cash-register/audit')
  getAudit(
    @Query('month') month: string | undefined,
    @Query('branchId', new ParseIntPipe({ optional: true })) branchId?: number,
  ): Promise<CashShiftAudit[]> {
    const range = mexicoMonthRange(month ?? '');
    if (!range) throw new BadRequestException('month debe tener la forma YYYY-MM');
    return this.cashRegister.getAudit(range, branchId);
  }
}
