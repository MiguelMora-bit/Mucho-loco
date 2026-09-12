/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`, no vale la pena tipar Prisma.MembershipUpdateArgs solo para las aserciones de este archivo. */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { PrismaService } from '../prisma/prisma.service';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

describe('MembershipsService', () => {
  let service: MembershipsService;
  let prisma: {
    membership: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
    membershipTier: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      membership: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      membershipTier: { findMany: jest.fn() },
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

  describe('retryPayment', () => {
    it('clears grace status and extends expiry ~30 days, regardless of prior state', async () => {
      prisma.membership.findUnique.mockResolvedValue({ userId: 'user-1' });
      prisma.membership.update.mockResolvedValue({
        tierKey: 'single',
        periodKey: 'monthly',
        expiresAt: daysFromNow(30),
        visits: 0,
        streak: 0,
        accessCode: 'ML-TEST',
        status: 'active',
        graceEndsAt: null,
        branch: { name: 'Condesa' },
      });

      const info = await service.retryPayment('user-1');

      expect(prisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({
            status: 'active',
            graceEndsAt: null,
          }),
        }),
      );
      expect(info.status).toBe('active');
      expect(info.graceEndsAt).toBeNull();
      expect(info.daysLeft).toBeGreaterThanOrEqual(29);
    });

    it('throws NotFoundException instead of silently creating a membership', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);
      await expect(service.retryPayment('user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.membership.update).not.toHaveBeenCalled();
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
