import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AccessCheckResult,
  MemberAccessRecord,
  MembershipPayment,
  PaymentMethod,
  PlanKey,
  TierKey,
} from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type { Branch, Membership, User } from '@prisma/client';
import { RenewMembershipDto, SignUpMemberDto } from './dto/counter-membership.dto';
import { PERIOD_DAYS, addDays, calculateMembershipPrice } from './membership-plans';

type MembershipWithOwner = Membership & { user: User; branch: Branch };

/**
 * expiresAt viaja en ISO, no como "20 JUL 2026". Mismo criterio que ya seguía
 * MembershipInfo en este backend (ver memberships.service.ts) — la fecha es un
 * dato, el formato es decisión de quien la pinta.
 */
function toAccessRecord(m: MembershipWithOwner): MemberAccessRecord {
  return {
    qrCode: m.accessCode,
    memberName: m.user.name,
    status: m.status,
    expiresAt: m.expiresAt.toISOString(),
    tierKey: m.tierKey,
    homeBranchId: m.branchId,
    homeBranchName: m.branch.name,
    fingerprintId: m.fingerprintId ?? undefined,
  };
}

/**
 * Regla de acceso al gimnasio — la MISMA sin importar el método de entrada
 * (QR, huella, nombre): ver "Membresía y alcance de acceso" en el CLAUDE.md
 * raíz. Gemela de `evaluateAccess` en branch-app, ahora del lado del
 * servidor: dejar pasar a alguien no puede depender de que el cliente calcule
 * bien la regla.
 *
 * El orden importa: `expired` gana sobre `wrong_branch` — una membresía
 * vencida se rechaza en CUALQUIER sucursal, no solo en la equivocada. `grace`
 * SÍ deja pasar (con aviso), que es el punto de tener periodo de gracia.
 */
export function evaluateAccess(
  record: MemberAccessRecord | undefined,
  branchId: number,
): AccessCheckResult {
  if (!record) return { outcome: 'not_found' };
  if (record.status === 'expired') return { outcome: 'expired', record };
  if (record.tierKey === 'single' && record.homeBranchId !== branchId) {
    return { outcome: 'wrong_branch', record };
  }
  return { outcome: 'valid', record };
}

/** Antes de generar uno nuevo: impredecible por diseño, un contador secuencial sería enumerable. */
function generateAccessCode(): string {
  return `ML-QR-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

@Injectable()
export class CounterMembershipsService {
  constructor(private prisma: PrismaService) {}

  private readonly include = { user: true, branch: true } as const;

  async findByQrCode(qrCode: string): Promise<MemberAccessRecord | null> {
    const row = await this.prisma.membership.findUnique({
      where: { accessCode: qrCode.trim() },
      include: this.include,
    });
    return row ? toAccessRecord(row) : null;
  }

  async findByFingerprint(fingerprintId: string): Promise<MemberAccessRecord | null> {
    const row = await this.prisma.membership.findUnique({
      where: { fingerprintId: fingerprintId.trim() },
      include: this.include,
    });
    return row ? toAccessRecord(row) : null;
  }

  /** Búsqueda difusa por nombre — puede devolver varios, de ahí el outcome 'ambiguous'. */
  async findByName(name: string): Promise<MemberAccessRecord[]> {
    const query = name.trim();
    if (!query) return [];
    const rows = await this.prisma.membership.findMany({
      where: { user: { name: { contains: query, mode: 'insensitive' } } },
      include: this.include,
      orderBy: { user: { name: 'asc' } },
      // Mostrador busca a UNA persona; si hay más de un puñado, el problema es
      // la búsqueda, no la lista — el tope evita volcar la base entera.
      take: 10,
    });
    return rows.map(toAccessRecord);
  }

  /**
   * Resuelve al socio por el método que venga y evalúa la regla de acceso.
   * Todos los métodos comparten la MISMA regla: agregar un cuarto (tarjeta
   * NFC, lo que sea) solo agrega una forma de encontrar el registro.
   */
  async checkAccess(
    branchId: number,
    query: { qrCode?: string; fingerprintId?: string; name?: string },
  ): Promise<AccessCheckResult> {
    if (query.qrCode !== undefined) {
      return evaluateAccess((await this.findByQrCode(query.qrCode)) ?? undefined, branchId);
    }
    if (query.fingerprintId !== undefined) {
      return evaluateAccess(
        (await this.findByFingerprint(query.fingerprintId)) ?? undefined,
        branchId,
      );
    }
    const candidates = await this.findByName(query.name ?? '');
    if (candidates.length === 0) return { outcome: 'not_found' };
    if (candidates.length > 1) return { outcome: 'ambiguous', candidates };
    return evaluateAccess(candidates[0], branchId);
  }

  /**
   * Renovar puede cambiar de tier y de sucursal de inscripción — el alcance de
   * acceso tiene que reflejar el plan NUEVO, no el que se está reemplazando.
   * La vigencia se cuenta desde hoy sin importar cuánto llevaba vencida, mismo
   * criterio que el retry-payment de la app.
   */
  async renew(branchId: number, dto: RenewMembershipDto): Promise<MembershipPayment> {
    const membership = await this.prisma.membership.findUnique({
      where: { accessCode: dto.qrCode.trim() },
      include: this.include,
    });
    if (!membership) throw new NotFoundException(`Member QR code not found: ${dto.qrCode}`);

    const amount = await this.priceFor(branchId, dto.tierKey, dto.periodKey);

    return this.prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: membership.id },
        data: {
          status: 'active',
          graceEndsAt: null,
          expiresAt: addDays(new Date(), PERIOD_DAYS[dto.periodKey]),
          tierKey: dto.tierKey,
          periodKey: dto.periodKey,
          branchId,
        },
      });
      const payment = await tx.membershipPayment.create({
        data: {
          branchId,
          membershipId: membership.id,
          qrCode: membership.accessCode,
          memberName: membership.user.name,
          phone: membership.user.phone,
          tierKey: dto.tierKey,
          periodKey: dto.periodKey,
          amount,
          paymentMethod: dto.paymentMethod,
          isNewMember: false,
        },
      });
      return toPayment(payment);
    });
  }

  /**
   * Alta en mostrador: crea al socio (sin cuenta de Cognito ni correo — no
   * necesita la app, ver "Métodos de acceso" en el CLAUDE.md raíz), su
   * membresía y el cobro, todo en una transacción.
   *
   * El accessCode se genera SIEMPRE, aunque el alta sea por huella: es la
   * identidad del registro con la que mostrador lo busca y lo renueva. El
   * socio no tiene que conocerlo ni cargarlo.
   */
  async signUp(branchId: number, dto: SignUpMemberDto): Promise<MembershipPayment> {
    const amount = await this.priceFor(branchId, dto.tierKey, dto.periodKey);
    const accessCode = generateAccessCode();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.memberName, phone: dto.phone },
      });
      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          branchId,
          tierKey: dto.tierKey,
          periodKey: dto.periodKey,
          expiresAt: addDays(new Date(), PERIOD_DAYS[dto.periodKey]),
          status: 'active',
          accessCode,
          fingerprintId: dto.fingerprintId ?? null,
        },
      });
      const payment = await tx.membershipPayment.create({
        data: {
          branchId,
          membershipId: membership.id,
          qrCode: accessCode,
          memberName: dto.memberName,
          phone: dto.phone,
          tierKey: dto.tierKey,
          periodKey: dto.periodKey,
          amount,
          paymentMethod: dto.paymentMethod,
          isNewMember: true,
        },
      });
      return toPayment(payment);
    });
  }

  /**
   * El precio base sale de la sucursal que cobra, no de una constante.
   * El mock de branch-app tenía `CURRENT_BRANCH_PRICE = 1090` fijo (Roma Sur),
   * así que Coyoacán ($890) y Santa Fe ($1390) cobraban lo mismo que Roma Sur.
   */
  private async priceFor(branchId: number, tierKey: TierKey, periodKey: PlanKey): Promise<number> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch not found: ${branchId}`);
    return calculateMembershipPrice(branch.price, tierKey, periodKey);
  }
}

function toPayment(row: {
  id: string;
  branchId: number;
  qrCode: string;
  memberName: string;
  phone: string;
  tierKey: TierKey;
  periodKey: PlanKey;
  amount: number;
  paymentMethod: string;
  isNewMember: boolean;
  createdAt: Date;
}): MembershipPayment {
  return {
    id: row.id,
    branchId: row.branchId,
    qrCode: row.qrCode,
    memberName: row.memberName,
    phone: row.phone,
    tierKey: row.tierKey,
    periodKey: row.periodKey,
    amount: row.amount,
    paymentMethod: row.paymentMethod as PaymentMethod,
    isNewMember: row.isNewMember,
    createdAt: row.createdAt.toISOString(),
  };
}
