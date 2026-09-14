/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`, no vale la pena tipar Prisma.MembershipUpdateArgs solo para las aserciones de este archivo. */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { GRACE_DAYS, graceDeadline } from './membership-status';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

describe('MembershipsService', () => {
  let service: MembershipsService;
  let prisma: {
    membership: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
    membershipTier: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      membership: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      membershipTier: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(MembershipsService);
  });

  describe('getForUser', () => {
    it('computes daysLeft from expiresAt instead of trusting a stored field', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        tierKey: 'all',
        periodKey: 'monthly',
        expiresAt: daysFromNow(12),
        visits: 5,
        streak: 2,
        accessCode: 'ML-TEST',
        status: 'active',
        graceEndsAt: null,
        branch: { name: 'Roma Sur' },
      });

      const info = await service.getForUser('user-1');
      expect(info.daysLeft).toBeGreaterThanOrEqual(11);
      expect(info.daysLeft).toBeLessThanOrEqual(12);
      expect(info.plan).toBe('ALL GYMS · MENSUAL');
      expect(info.branch).toBe('Roma Sur');
    });

    it('clamps daysLeft to zero for an already-expired membership, never negative', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        tierKey: 'single',
        periodKey: 'monthly',
        expiresAt: daysFromNow(-5),
        visits: 0,
        streak: 0,
        accessCode: 'ML-TEST',
        status: 'expired',
        graceEndsAt: null,
        branch: { name: 'Condesa' },
      });

      const info = await service.getForUser('user-1');
      expect(info.daysLeft).toBe(0);
    });

    it('throws NotFoundException when the user has no membership row', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);
      await expect(service.getForUser('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getForUser — estado efectivo', () => {
    const row = {
      tierKey: 'all',
      periodKey: 'monthly',
      visits: 0,
      streak: 0,
      accessCode: 'ML-TEST',
      graceEndsAt: null,
      branch: { name: 'Roma Sur' },
    };

    // Nadie cambia `status` el día que vence: la fila dice 'active' y la
    // membresía ya no debe abrir la puerta.
    it('reports a lapsed membership nobody renews as expired, whatever the row says', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        ...row,
        status: 'active',
        expiresAt: daysFromNow(-1),
        stripeSubscriptionId: null,
      });

      const info = await service.getForUser('user-1');
      expect(info.status).toBe('expired');
      expect(info.autoRenews).toBe(false);
    });

    it('flags a subscription-backed membership as auto-renewing', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        ...row,
        status: 'active',
        expiresAt: daysFromNow(20),
        stripeSubscriptionId: 'sub_1',
      });

      const info = await service.getForUser('user-1');
      expect(info.status).toBe('active');
      expect(info.autoRenews).toBe(true);
    });
  });

  describe('grant', () => {
    const grant = {
      userId: 'user-1',
      branchId: 3,
      tierKey: 'single' as const,
      periodKey: 'monthly' as const,
      paidThrough: daysFromNow(30),
      stripeSubscriptionId: 'sub_1',
    };

    it('creates the membership on the first confirmed payment, with a stable access code', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await service.grant(grant);

      expect(prisma.membership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({
            accessCode: 'ML-USER1',
            branchId: 3,
            status: 'active',
            stripeSubscriptionId: 'sub_1',
          }),
        }),
      );
    });

    it('never shortens a membership that was already paid further out', async () => {
      const further = daysFromNow(40);
      prisma.membership.findUnique.mockResolvedValue({
        expiresAt: further,
        stripeSubscriptionId: null,
      });

      await service.grant(grant);

      const args = prisma.membership.upsert.mock.calls[0][0];
      expect(args.update.expiresAt).toBe(further);
    });

    it('clears a grace period when the payment finally goes through', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        expiresAt: daysFromNow(-2),
        stripeSubscriptionId: 'sub_1',
      });

      await service.grant(grant);

      const args = prisma.membership.upsert.mock.calls[0][0];
      expect(args.update).toMatchObject({
        status: 'active',
        graceEndsAt: null,
      });
    });

    it('leaves the subscription link alone when the grant does not mention one', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await service.grant({ ...grant, stripeSubscriptionId: undefined });

      const args = prisma.membership.upsert.mock.calls[0][0];
      expect(args.update).not.toHaveProperty('stripeSubscriptionId');
    });
  });

  describe('enterGrace', () => {
    it(`gives only the active membership of that subscription ${GRACE_DAYS} days of grace`, async () => {
      const now = new Date('2026-09-13T12:00:00.000Z');

      await service.enterGrace('sub_1', now);

      expect(prisma.membership.updateMany).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_1', status: 'active' },
        data: { status: 'grace', graceEndsAt: graceDeadline(now) },
      });
    });
  });

  describe('expireLapsed', () => {
    it('persists the three lapse rules in one transaction and reports how many changed', async () => {
      prisma.$transaction.mockResolvedValue([
        { count: 1 },
        { count: 2 },
        { count: 0 },
      ]);

      expect(await service.expireLapsed()).toBe(3);
      expect(prisma.membership.updateMany).toHaveBeenCalledTimes(3);
    });
  });

  describe('getTiers', () => {
    it('maps every catalog row through the JSON fields untouched', async () => {
      prisma.membershipTier.findMany.mockResolvedValue([
        {
          key: 'single',
          name: { es: 'A', en: 'B' },
          factor: 1,
          perks: { es: ['x'], en: ['y'] },
          badge: { es: 'C', en: 'D' },
          popular: false,
        },
      ]);
      const tiers = await service.getTiers();
      expect(tiers).toHaveLength(1);
      expect(tiers[0].key).toBe('single');
      expect(tiers[0].name).toEqual({ es: 'A', en: 'B' });
    });
  });
});
