import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { AccessCheckResult, MemberAccessRecord, MembershipPayment } from '@mucho-loco/types';
import { CounterMembershipsService } from './counter-memberships.service';
import { RenewMembershipDto, SignUpMemberDto } from './dto/counter-membership.dto';
import { Roles } from '../auth/roles.decorator';

/**
 * Mostrador: validar acceso, renovar y dar de alta socios.
 *
 * Todo pide rol `staff` — es la operación diaria de una sucursal, no algo de
 * HQ. El `branchId` va en la ruta (no en el body) porque es DONDE está
 * pasando: la misma renovación cobrada en Coyoacán o en Santa Fe cuesta
 * distinto, y el corte de caja de cada sucursal tiene que verla.
 */
@Controller('branches/:branchId')
export class CounterMembershipsController {
  constructor(private memberships: CounterMembershipsService) {}

  /**
   * Un solo endpoint para los 3 métodos de entrada (`?qrCode=`,
   * `?fingerprintId=`, `?name=`) porque los 3 terminan en la MISMA regla de
   * acceso — separarlos duplicaría esa regla en tres rutas.
   */
  @Roles('staff')
  @Get('member-access')
  checkAccess(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('qrCode') qrCode?: string,
    @Query('fingerprintId') fingerprintId?: string,
    @Query('name') name?: string,
  ): Promise<AccessCheckResult> {
    const given = [qrCode, fingerprintId, name].filter((v) => v !== undefined);
    if (given.length !== 1) {
      throw new BadRequestException('Se requiere exactamente uno de: qrCode, fingerprintId, name');
    }
    return this.memberships.checkAccess(branchId, { qrCode, fingerprintId, name });
  }

  /** Búsqueda cruda (sin evaluar acceso) — la usa mostrador para renovar, donde
   *  encontrar al socio no implica dejarlo pasar. */
  @Roles('staff')
  @Get('members')
  async findMember(
    @Param('branchId', ParseIntPipe) _branchId: number,
    @Query('qrCode') qrCode: string,
  ): Promise<MemberAccessRecord | null> {
    return this.memberships.findByQrCode(qrCode ?? '');
  }

  @Roles('staff')
  @Post('memberships/renew')
  renew(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: RenewMembershipDto,
  ): Promise<MembershipPayment> {
    return this.memberships.renew(branchId, dto);
  }

  @Roles('staff')
  @Post('memberships/signup')
  signUp(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: SignUpMemberDto,
  ): Promise<MembershipPayment> {
    return this.memberships.signUp(branchId, dto);
  }
}
