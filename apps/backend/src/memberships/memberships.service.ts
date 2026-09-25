import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type {
  LocalizedString,
  MembershipInfo,
  MembershipTier,
  PlanKey,
  TierKey,
} from '@mucho-loco/types';
import { Prisma } from '@prisma/client';
import type {
  Branch,
  Membership,
  MembershipTier as MembershipTierRow,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  effectiveStatus,
  graceDeadline,
  RENEWAL_TOLERANCE_DAYS,
} from './membership-status';

const DAY_MS = 86_400_000;

type MembershipWithBranch = Membership & { branch: Branch };

function toMembershipTier(row: MembershipTierRow): MembershipTier {
  return {
    key: row.key,
    name: row.name as unknown as LocalizedString,
    factor: row.factor,
    basePrice: row.basePrice ?? undefined,
    perks: row.perks as unknown as Record<'es' | 'en', string[]>,
    badge: row.badge as unknown as LocalizedString,
    popular: row.popular,
  };
}

/** Determinístico a partir del id del usuario — así una renovación o
 *  lecturas repetidas no generan un accessCode nuevo: el QR no rota. */
function accessCodeFor(userId: string): string {
  return `ML-${userId.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
  );
}

/** Lo que un cobro confirmado le da al socio. */
export interface MembershipGrant {
  userId: string;
  branchId: number;
  tierKey: TierKey;
  periodKey: PlanKey;
  /** Hasta cuándo queda pagada. */
  paidThrough: Date;
  /**
   * La suscripción que la va a renovar. `undefined` = no tocar la que ya
   * tenga: una visita suelta no cancela ni desliga nada.
   */
  stripeSubscriptionId?: string | null;
  /** El socio canceló la renovación en el portal (`cancel_at_period_end`). Solo junto con la suscripción. */
  renewalCanceled?: boolean;
}

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(private prisma: PrismaService) {}

  async getTiers(): Promise<MembershipTier[]> {
    const rows = await this.prisma.membershipTier.findMany();
    return rows.map(toMembershipTier);
  }

  /**
   * 404 si el socio nunca ha contratado. Un socio nuevo ya NO nace con
   * membresía (antes se le regalaba una mensual de 15 sucursales al
   * registrarse): la membresía existe desde su primer cobro confirmado.
   */
  async getForUser(userId: string): Promise<MembershipInfo> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId },
      include: { branch: true },
    });
    if (!membership)
      throw new NotFoundException('Membership not found for user');
    return toMembershipInfo(membership);
  }

  findByUser(userId: string): Promise<Membership | null> {
    return this.prisma.membership.findUnique({ where: { userId } });
  }

  /**
   * Activa o renueva una membresía tras un cobro confirmado; la crea la
   * primera vez. Nunca acorta: si la membresía ya estaba pagada más allá de
   * `paidThrough` (renovó antes de tiempo, o vuelve a llegar un webhook viejo),
   * se queda con la fecha mayor.
   *
   * `db` = la transacción del caller, cuando el cobro y la membresía tienen que
   * escribirse juntos (ver MembershipBillingService, visitas).
   */
  async grant(
    grant: MembershipGrant,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    try {
      await this.upsertGrant(grant, db);
    } catch (err) {
      // Dos webhooks del mismo cobro (invoice.paid y checkout.session.completed)
      // pueden llegar a la vez con un socio sin fila: gana un insert y el otro
      // choca con `userId @unique`. Reintentar cae en el update. Dentro de una
      // transacción no se puede (Postgres la aborta), así que ahí sube el error.
      if (db !== this.prisma || !isUniqueViolation(err)) throw err;
      await this.upsertGrant(grant, db);
    }
  }

  private async upsertGrant(
    grant: MembershipGrant,
    db: Prisma.TransactionClient,
  ): Promise<void> {
    const existing = await db.membership.findUnique({
      where: { userId: grant.userId },
    });
    const expiresAt =
      existing && existing.expiresAt > grant.paidThrough
        ? existing.expiresAt
        : grant.paidThrough;
    const data = {
      branchId: grant.branchId,
      tierKey: grant.tierKey,
      periodKey: grant.periodKey,
      expiresAt,
      status: 'active' as const,
      graceEndsAt: null,
      ...(grant.stripeSubscriptionId !== undefined
        ? {
            stripeSubscriptionId: grant.stripeSubscriptionId,
            renewalCanceled: grant.renewalCanceled ?? false,
          }
        : {}),
    };
    await db.membership.upsert({
      where: { userId: grant.userId },
      create: {
        userId: grant.userId,
        accessCode: accessCodeFor(grant.userId),
        ...data,
      },
      update: data,
    });
  }

  /**
   * Falló el cobro de una renovación: acceso con aviso hasta `GRACE_DAYS`.
   * Solo pasa de `active` a `grace` — un evento reentregado no alarga la
   * gracia, y una membresía ya suspendida no revive por un aviso de fallo.
   */
  async enterGrace(
    stripeSubscriptionId: string,
    now: Date = new Date(),
  ): Promise<void> {
    await this.prisma.membership.updateMany({
      where: { stripeSubscriptionId, status: 'active' },
      data: { status: 'grace', graceEndsAt: graceDeadline(now) },
    });
  }

  /**
   * La suscripción terminó (cancelada, o Stripe se rindió de cobrarla). Lo ya
   * pagado se respeta: la membresía sigue hasta `expiresAt` y ahí vence sola,
   * porque ya nada la renueva.
   */
  async detachSubscription(stripeSubscriptionId: string): Promise<void> {
    await this.prisma.membership.updateMany({
      where: { stripeSubscriptionId },
      data: { stripeSubscriptionId: null, renewalCanceled: false },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sweepLapsed(): Promise<void> {
    const expired = await this.expireLapsed();
    if (expired > 0)
      this.logger.log(`${expired} membresías pasaron a vencidas`);
  }

  /**
   * Guarda en la base lo que `effectiveStatus` ya calcula al leer — las MISMAS
   * tres reglas, en SQL. Al socio y a la sucursal no les hace falta (ellos
   * leen el estado efectivo al momento), pero los reportes ("clientes activos
   * por sucursal") y el barrido de avisos cuentan `status` directo.
   */
  async expireLapsed(now: Date = new Date()): Promise<number> {
    const renewalDeadline = new Date(
      now.getTime() - RENEWAL_TOLERANCE_DAYS * DAY_MS,
    );
    const results = await this.prisma.$transaction([
      this.prisma.membership.updateMany({
        where: { status: 'grace', graceEndsAt: { lte: now } },
        data: { status: 'expired' },
      }),
      this.prisma.membership.updateMany({
        where: {
          status: 'active',
          stripeSubscriptionId: null,
          expiresAt: { lte: now },
        },
        data: { status: 'expired' },
      }),
      this.prisma.membership.updateMany({
        where: {
          status: 'active',
          stripeSubscriptionId: { not: null },
          expiresAt: { lte: renewalDeadline },
        },
        data: { status: 'expired' },
      }),
    ]);
    return results.reduce((sum, r) => sum + r.count, 0);
  }
}

function toMembershipInfo(membership: MembershipWithBranch): MembershipInfo {
  const status = effectiveStatus(membership);
  const daysLeft = Math.max(
    0,
    Math.ceil((membership.expiresAt.getTime() - Date.now()) / DAY_MS),
  );
  return {
    branch: membership.branch.name,
    tierKey: membership.tierKey,
    // Claves, no texto: el nombre del plan lo traduce quien lo pinta (spec 011).
    periodKey: membership.periodKey,
    expiresAt: membership.expiresAt.toISOString(),
    visits: membership.visits,
    streak: membership.streak,
    daysLeft,
    accessCode: membership.accessCode,
    status,
    graceEndsAt:
      status === 'grace'
        ? (membership.graceEndsAt?.toISOString() ?? null)
        : null,
    // "Se renueva sola" solo si la suscripción vive Y el socio no canceló la
    // renovación en el portal; con la renovación cancelada sigue teniendo
    // suscripción (y acceso) hasta el fin del periodo.
    autoRenews:
      membership.stripeSubscriptionId !== null &&
      !membership.renewalCanceled &&
      status !== 'expired',
    hasSubscription:
      membership.stripeSubscriptionId !== null && status !== 'expired',
  };
}
