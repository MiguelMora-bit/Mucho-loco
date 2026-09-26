import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccessCheckResult,
  CheckIn,
  CheckInResult,
  MemberAccessRecord,
  MembershipPayment,
  OverdueBalance,
  PaymentMethod,
  PlanKey,
  TierKey,
} from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type {
  Branch,
  Membership,
  MembershipPayment as MembershipPaymentRow,
  Prisma,
  User,
} from '@prisma/client';
import { RenewMembershipDto, SettleOverdueDto, SignUpMemberDto } from './dto/counter-membership.dto';
import { PERIOD_DAYS, addDays, calculateMembershipPrice } from '../memberships/membership-plans';
import { effectiveStatus } from '../memberships/membership-status';
import { dayDate, mexicoDay } from '../memberships/visit-stats';
import {
  memberNotFound,
  memberRenewsOnline,
  nothingToPay,
  paymentProviderError,
} from '../common/error-codes';
import { MembershipBillingService } from '../payments/membership-billing.service';
import { ChargesService, counterChargeMethod, toCents } from '../charges/charges.service';

type MembershipWithOwner = Membership & { user: User; branch: Branch };

/**
 * expiresAt viaja en ISO, no como "20 JUL 2026". Mismo criterio que ya seguía
 * MembershipInfo en este backend (ver memberships.service.ts) — la fecha es un
 * dato, el formato es decisión de quien la pinta.
 */
/** Stripe se la cobra sola: suscripción viva, renovación sin cancelar, no vencida. */
function renewsOnline(m: Membership): boolean {
  return Boolean(m.stripeSubscriptionId) && !m.renewalCanceled && effectiveStatus(m) !== 'expired';
}

function toAccessRecord(m: MembershipWithOwner): MemberAccessRecord {
  return {
    qrCode: m.accessCode,
    memberName: m.user.name,
    // El estado al momento del check-in, no el guardado: una membresía que
    // venció hace una hora ya no abre la puerta aunque el cron no haya pasado.
    status: effectiveStatus(m),
    expiresAt: m.expiresAt.toISOString(),
    tierKey: m.tierKey,
    homeBranchId: m.branchId,
    homeBranchName: m.branch.name,
    fingerprintId: m.fingerprintId ?? undefined,
    renewsOnline: renewsOnline(m),
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
  private readonly logger = new Logger(CounterMembershipsService.name);

  constructor(
    private prisma: PrismaService,
    private charges: ChargesService,
    private billing: MembershipBillingService,
  ) {}

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
   * Validar en mostrador ES la entrada (spec 012): la misma regla de acceso y,
   * si deja pasar, la visita queda registrada en esta sucursal. Un acceso
   * negado no registra nada.
   */
  async checkIn(
    branchId: number,
    query: { qrCode?: string; fingerprintId?: string; name?: string },
  ): Promise<CheckInResult> {
    const result = await this.checkAccess(branchId, query);
    if (result.outcome !== 'valid') return result;
    return { ...result, checkIn: await this.recordEntry(result.record.qrCode, branchId) };
  }

  /**
   * Una visita por socio por día de CDMX, garantizado por el índice único
   * `(userId, visitDay)`: `ON CONFLICT DO NOTHING` hace que dos escaneos
   * simultáneos registren uno solo, sin error. Un segundo escaneo del día
   * devuelve la hora de la PRIMERA entrada — mostrador ve "ya había entrado
   * hoy", la señal de un QR prestado.
   */
  private async recordEntry(qrCode: string, branchId: number, now = new Date()): Promise<CheckIn> {
    const { userId } = await this.prisma.membership.findUniqueOrThrow({
      where: { accessCode: qrCode },
      select: { userId: true },
    });
    const visitDay = dayDate(mexicoDay(now));
    const { count } = await this.prisma.visit.createMany({
      data: [{ userId, branchId, visitedAt: now, visitDay }],
      skipDuplicates: true,
    });
    const visit = await this.prisma.visit.findUniqueOrThrow({
      where: { userId_visitDay: { userId, visitDay } },
    });
    return { visitedAt: visit.visitedAt.toISOString(), firstToday: count === 1 };
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
    if (!membership) throw new NotFoundException(memberNotFound(dto.qrCode));
    // Spec 006: Stripe ya se la cobra; cobrarla aquí también sería cobrar dos veces.
    if (renewsOnline(membership)) throw new ConflictException(memberRenewsOnline(dto.qrCode));

    const amount = await this.priceFor(branchId, dto.tierKey, dto.periodKey);
    // Lo ya pagado no se pierde: una membresía vigente suma desde su
    // vencimiento (igual que renovar en línea); una vencida, desde hoy.
    const now = new Date();
    const from =
      effectiveStatus(membership, now) !== 'expired' && membership.expiresAt > now
        ? membership.expiresAt
        : now;

    return this.prisma.$transaction(async (tx) => {
      await tx.membership.update({
        where: { id: membership.id },
        data: {
          status: 'active',
          graceEndsAt: null,
          expiresAt: addDays(from, PERIOD_DAYS[dto.periodKey]),
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
          cardType: dto.paymentMethod === 'card' ? (dto.cardType ?? null) : null,
          isNewMember: false,
        },
      });
      await this.recordCharge(tx, payment, membership.userId);
      return toPayment(payment);
    });
  }

  /**
   * Spec 019: el atraso de un socio en gracia con suscripción — la factura que
   * Stripe no pudo cobrar. Sin suscripción, sin gracia o sin factura abierta:
   * no hay nada que cobrar aquí (409).
   */
  async getOverdue(qrCode: string): Promise<OverdueBalance> {
    const { membership, invoice } = await this.overdueFor(qrCode);
    return {
      amount: Math.round(invoice.amountCents / 100),
      tierKey: membership.tierKey,
      periodKey: membership.periodKey,
    };
  }

  /**
   * Cobrar ese atraso. Primero Stripe (marcar la factura pagada fuera de su
   * plataforma): si no acepta, no se registra nada. Después, en una
   * transacción, el pago de caja y el cobro de ESTA sucursal — el webhook de
   * esa factura ya no registra otro. Al final se relee la suscripción, así la
   * membresía queda activa sin esperar el webhook.
   */
  async settleOverdue(branchId: number, dto: SettleOverdueDto): Promise<MembershipPayment> {
    const { membership, invoice } = await this.overdueFor(dto.qrCode);
    try {
      await this.billing.settleOutOfBand(invoice.id);
    } catch (e) {
      throw new BadGatewayException(paymentProviderError(e instanceof Error ? e.message : String(e)));
    }

    let payment: MembershipPaymentRow;
    try {
      payment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.membershipPayment.create({
          data: {
            branchId,
            membershipId: membership.id,
            qrCode: membership.accessCode,
            memberName: membership.user.name,
            phone: membership.user.phone,
            tierKey: membership.tierKey,
            periodKey: membership.periodKey,
            amount: Math.round(invoice.amountCents / 100),
            paymentMethod: dto.paymentMethod,
            cardType: dto.paymentMethod === 'card' ? (dto.cardType ?? null) : null,
            isNewMember: false,
          },
        });
        await this.recordCharge(tx, created, membership.userId);
        return created;
      });
    } catch (e) {
      // Stripe ya la dio por pagada y aquí no quedó registro: hay que
      // cuadrarlo a mano. Raro (la base falló justo después), pero no se calla.
      this.logger.error(
        `Factura ${invoice.id} marcada pagada en Stripe sin pago de caja registrado (socio ${membership.accessCode})`,
      );
      throw e;
    }
    await this.billing.syncSubscription(membership.stripeSubscriptionId as string);
    return toPayment(payment);
  }

  private async overdueFor(qrCode: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { accessCode: qrCode.trim() },
      include: this.include,
    });
    if (!membership) throw new NotFoundException(memberNotFound(qrCode));
    if (!membership.stripeSubscriptionId || effectiveStatus(membership) !== 'grace') {
      throw new ConflictException(nothingToPay());
    }
    const invoice = await this.billing.overdueInvoice(membership.stripeSubscriptionId);
    if (!invoice) throw new ConflictException(nothingToPay());
    return { membership, invoice };
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
          cardType: dto.paymentMethod === 'card' ? (dto.cardType ?? null) : null,
          isNewMember: true,
        },
      });
      await this.recordCharge(tx, payment, user.id);
      return toPayment(payment);
    });
  }

  /** El cobro de mostrador entra al registro de cobros en la misma transacción que lo cobra. */
  private recordCharge(
    tx: Prisma.TransactionClient,
    payment: MembershipPaymentRow,
    userId: string,
  ): Promise<boolean> {
    return this.charges.recordMembership(tx, {
      source: 'counter_membership',
      method: counterChargeMethod(payment.paymentMethod, payment.cardType),
      paidAt: payment.createdAt,
      userId,
      branchId: payment.branchId,
      tierKey: payment.tierKey,
      periodKey: payment.periodKey,
      totalCents: toCents(payment.amount),
      origin: { membershipPaymentId: payment.id },
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
  cardType?: 'credit' | 'debit' | null;
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
    ...(row.cardType ? { cardType: row.cardType } : {}),
    isNewMember: row.isNewMember,
    createdAt: row.createdAt.toISOString(),
  };
}
