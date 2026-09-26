import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type {
  AccessAlert,
  CheckInResult,
  MemberAccessRecord,
  MembershipPayment,
  OverdueBalance,
} from '@mucho-loco/types';
import { CounterMembershipsService } from './counter-memberships.service';
import { CheckInDto, RenewMembershipDto, SettleOverdueDto, SignUpMemberDto } from './dto/counter-membership.dto';
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
   * Validar el acceso en la puerta Y registrar la entrada (spec 012). Un solo
   * endpoint para los 3 métodos de entrada (`qrCode`, `fingerprintId`, `name`)
   * porque los 3 terminan en la MISMA regla — separarlos la duplicaría en tres
   * rutas. POST y no GET: deja una visita. 200 y no 201: la respuesta es la
   * evaluación, y un acceso negado o un segundo escaneo no crean nada.
   */
  @Roles('staff')
  @Post('check-ins')
  @HttpCode(200)
  checkIn(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: CheckInDto,
  ): Promise<CheckInResult> {
    const given = [dto.qrCode, dto.fingerprintId, dto.name].filter((v) => v !== undefined);
    if (given.length !== 1) {
      throw new BadRequestException('Se requiere exactamente uno de: qrCode, fingerprintId, name');
    }
    return this.memberships.checkIn(branchId, dto);
  }

  @Roles('staff')
  @Post('memberships/renew')
  renew(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: RenewMembershipDto,
  ): Promise<MembershipPayment> {
    return this.memberships.renew(branchId, dto);
  }

  /** Spec 019: el atraso de la suscripción de un socio en gracia (409 si no hay). */
  @Roles('staff')
  @Get('memberships/overdue')
  getOverdue(
    @Param('branchId', ParseIntPipe) _branchId: number,
    @Query('qrCode') qrCode = '',
  ): Promise<OverdueBalance> {
    return this.memberships.getOverdue(qrCode);
  }

  /** Cobrarlo en esta sucursal; Stripe marca la factura pagada fuera de su plataforma. */
  @Roles('staff')
  @Post('memberships/overdue')
  settleOverdue(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: SettleOverdueDto,
  ): Promise<MembershipPayment> {
    return this.memberships.settleOverdue(branchId, dto);
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


/**
 * Búsqueda cruda de un socio, SIN evaluar acceso — la usa mostrador para
 * renovar, donde encontrar al socio no implica dejarlo pasar.
 *
 * Fuera de `branches/:branchId` a propósito: un `accessCode` es único en toda
 * la cadena, así que la sucursal no participa en la búsqueda. Tenerla en la
 * ruta obligaría a inventar un valor cuando no viene al caso.
 */
@Controller('members')
export class MembersController {
  constructor(private memberships: CounterMembershipsService) {}

  @Roles('staff')
  @Get()
  findMember(@Query('qrCode') qrCode?: string): Promise<MemberAccessRecord | null> {
    return this.memberships.findByQrCode(qrCode ?? '');
  }
}

/**
 * Spec 020: el mismo QR en dos sucursales el mismo día. Es de HQ: una sucursal
 * solo ve el aviso en su mostrador, en el momento.
 */
@Controller('access-alerts')
export class AccessAlertsController {
  constructor(private memberships: CounterMembershipsService) {}

  @Roles('owner')
  @Get()
  list(): Promise<AccessAlert[]> {
    return this.memberships.listAccessAlerts();
  }
}
