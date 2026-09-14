import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { AttendanceEntry } from '@mucho-loco/types';
import { AttendanceService } from './attendance.service';
import { ClockInDto, ClockOutDto } from './dto/clock-in.dto';
import { Roles } from '../auth/roles.decorator';

/**
 * Captura de asistencia en sucursal.
 *
 * `staffEmail` viaja en el body y NO se saca del token a propósito: en
 * mostrador ficha una sola tablet compartida, con la sesión de quien la
 * abrió — el que ficha no es necesariamente el dueño del token. Es lo
 * contrario de `/users/me`, donde la identidad SÍ tiene que salir del token
 * porque ahí sí es "yo".
 */
@Controller()
export class AttendanceController {
  constructor(private attendance: AttendanceService) {}

  @Roles('staff')
  @Get('attendance/open')
  getOpenEntry(@Query('staffEmail') staffEmail: string): Promise<AttendanceEntry | null> {
    return this.attendance.getOpenEntry(staffEmail ?? '');
  }

  @Roles('staff')
  @Post('branches/:branchId/attendance/clock-in')
  clockIn(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: ClockInDto,
  ): Promise<AttendanceEntry> {
    return this.attendance.clockIn(branchId, dto.staffEmail, dto.staffName);
  }

  @Roles('staff')
  @Post('attendance/clock-out')
  clockOut(@Body() dto: ClockOutDto): Promise<AttendanceEntry> {
    return this.attendance.clockOut(dto.staffEmail);
  }

  @Roles('manager')
  @Get('branches/:branchId/attendance/today')
  getTeamToday(@Param('branchId', ParseIntPipe) branchId: number): Promise<AttendanceEntry[]> {
    return this.attendance.getTeamToday(branchId);
  }
}
