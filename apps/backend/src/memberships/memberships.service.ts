import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  LocalizedString,
  MembershipInfo,
  MembershipTier,
  PlanKey,
  TierKey,
} from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import type {
  Branch,
  Membership,
  MembershipTier as MembershipTierRow,
} from '@prisma/client';

// Roma Sur — mismo default que fallbackRecord() en customer-app/lib/datasources/mock/user.mock.ts.
const DEFAULT_BRANCH_ID = 1;
const PERIOD_DAYS: Record<PlanKey, number> = {
  visit: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  annual: 365,
};
// Mismo texto que ya usa el mock (ALL GYMS/1 GYM, sin traducir) — no es un
// contrato localizado hoy, y no es este backend quien debería arreglarlo
// (ver "Pendiente" en el CLAUDE.md de customer-app sobre Visit.day/.month,
// mismo tipo de defecto latente aceptado por ahora).
const TIER_LABEL: Record<TierKey, string> = {
  single: '1 GYM',
  all: 'ALL GYMS',
};
const PERIOD_LABEL: Record<PlanKey, string> = {
  visit: 'VISITA',
  weekly: 'SEMANAL',
  monthly: 'MENSUAL',
  quarterly: 'TRIMESTRAL',
  annual: 'ANUAL',
};

type MembershipWithBranch = Membership & { branch: Branch };

function toMembershipTier(row: MembershipTierRow): MembershipTier {
  return {
    key: row.key,
    name: row.name as unknown as LocalizedString,
    factor: row.factor,
    perks: row.perks as unknown as Record<'es' | 'en', string[]>,
    badge: row.badge as unknown as LocalizedString,
    popular: row.popular,
  };
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Determinístico a partir del id del usuario — así retryPayment/lecturas
 *  repetidas no generan un accessCode nuevo cada vez. */
function accessCodeFor(userId: string): string {
  return `ML-${userId.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

@Injectable()
export class MembershipsService {
  constructor(private prisma: PrismaService) {}

  async getTiers(): Promise<MembershipTier[]> {
    const rows = await this.prisma.membershipTier.findMany();
    return rows.map(toMembershipTier);
  }

  async createDefaultForUser(userId: string): Promise<void> {
    await this.prisma.membership.create({
      data: {
        userId,
        branchId: DEFAULT_BRANCH_ID,
        tierKey: 'all',
        periodKey: 'monthly',
        expiresAt: addDays(new Date(), PERIOD_DAYS.monthly),
        status: 'active',
        accessCode: accessCodeFor(userId),
      },
    });
  }

  async getForUser(userId: string): Promise<MembershipInfo> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId },
      include: { branch: true },
    });
    if (!membership)
      throw new NotFoundException('Membership not found for user');
    return toMembershipInfo(membership);
  }

  /** Simula la pasarela de pago cobrando de nuevo — siempre tiene éxito (no
   *  hay pasarela real todavía, mismo criterio que retryMembershipPayment()
   *  en el mock de customer-app). Extiende un mes desde hoy sin importar
   *  cuánto llevaba vencida. */
  async retryPayment(userId: string): Promise<MembershipInfo> {
    const exists = await this.prisma.membership.findUnique({
      where: { userId },
    });
    if (!exists) throw new NotFoundException('Membership not found for user');

    const membership = await this.prisma.membership.update({
      where: { userId },
      data: {
        status: 'active',
        graceEndsAt: null,
        expiresAt: addDays(new Date(), PERIOD_DAYS.monthly),
      },
      include: { branch: true },
    });
    return toMembershipInfo(membership);
  }
}

function toMembershipInfo(membership: MembershipWithBranch): MembershipInfo {
  const daysLeft = Math.max(
    0,
    Math.ceil((membership.expiresAt.getTime() - Date.now()) / 86_400_000),
  );
  return {
    plan: `${TIER_LABEL[membership.tierKey]} · ${PERIOD_LABEL[membership.periodKey]}`,
    branch: membership.branch.name,
    tierKey: membership.tierKey,
    expiresAt: membership.expiresAt.toISOString(),
    visits: membership.visits,
    streak: membership.streak,
    daysLeft,
    accessCode: membership.accessCode,
    status: membership.status,
    graceEndsAt: membership.graceEndsAt?.toISOString() ?? null,
  };
}
