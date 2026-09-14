/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { MemberAccessRecord } from '@mucho-loco/types';
import { CounterMembershipsService, evaluateAccess } from './counter-memberships.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateMembershipPrice } from '../memberships/membership-plans';

const ROMA_SUR = 1;
const CONDESA = 3;

function record(overrides: Partial<MemberAccessRecord> = {}): MemberAccessRecord {
  return {
    qrCode: 'ML-QR-TEST',
    memberName: 'Test Member',
    status: 'active',
    expiresAt: '2030-01-01T00:00:00.000Z',
    tierKey: 'all',
    homeBranchId: ROMA_SUR,
    homeBranchName: 'ROMA SUR',
    ...overrides,
  };
}

// Gemelo del test de evaluateAccess en branch-app: la regla es la misma, pero
// ahora también la aplica el servidor. Si las dos se separan, este test y el
// de allá dejan de coincidir.
describe('evaluateAccess', () => {
  it('returns not_found when there is no record', () => {
    expect(evaluateAccess(undefined, ROMA_SUR)).toEqual({ outcome: 'not_found' });
  });

  it('allows an active all-gyms member at any branch', () => {
    const r = record({ tierKey: 'all' });
    expect(evaluateAccess(r, CONDESA)).toEqual({ outcome: 'valid', record: r });
  });

  it('allows a single-gym member at their home branch', () => {
    const r = record({ tierKey: 'single', homeBranchId: CONDESA });
    expect(evaluateAccess(r, CONDESA)).toEqual({ outcome: 'valid', record: r });
  });

  it('rejects a single-gym member at a different branch', () => {
    const r = record({ tierKey: 'single', homeBranchId: CONDESA });
    expect(evaluateAccess(r, ROMA_SUR)).toEqual({ outcome: 'wrong_branch', record: r });
  });

  it('lets a member in grace period through, with the warning left upstream', () => {
    const r = record({ status: 'grace' });
    expect(evaluateAccess(r, ROMA_SUR)).toEqual({ outcome: 'valid', record: r });
  });

  it('denies an expired member even at their own home branch', () => {
    const r = record({ status: 'expired', tierKey: 'single', homeBranchId: ROMA_SUR });
    expect(evaluateAccess(r, ROMA_SUR)).toEqual({ outcome: 'expired', record: r });
  });
});

describe('CounterMembershipsService', () => {
  let service: CounterMembershipsService;
  let prisma: {
    membership: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock; create: jest.Mock };
    membershipPayment: { create: jest.Mock };
    branch: { findUnique: jest.Mock };
    user: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const romaSurRow = {
    id: 'm1',
    accessCode: 'ML-DIEGO-2026-ALLGYMS',
    status: 'active',
    expiresAt: new Date('2030-07-20'), // a futuro: una fecha pasada ya cuenta como vencida (membership-status.ts)
    tierKey: 'all',
    branchId: ROMA_SUR,
    fingerprintId: null,
    user: { name: 'Diego Ramírez', phone: '55 1234 5678' },
    branch: { name: 'ROMA SUR' },
  };

  beforeEach(async () => {
    prisma = {
      membership: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
      membershipPayment: { create: jest.fn() },
      branch: { findUnique: jest.fn() },
      user: { create: jest.fn() },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    const module = await Test.createTestingModule({
      providers: [CounterMembershipsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CounterMembershipsService);
  });

  it('exposes expiresAt as ISO, not as pre-formatted Spanish text', async () => {
    prisma.membership.findUnique.mockResolvedValue(romaSurRow);

    const found = await service.findByQrCode('ML-DIEGO-2026-ALLGYMS');

    expect(found?.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('trims the scanned code — a physical reader can append whitespace', async () => {
    prisma.membership.findUnique.mockResolvedValue(romaSurRow);

    await service.findByQrCode('  ML-DIEGO-2026-ALLGYMS\n');

    expect(prisma.membership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accessCode: 'ML-DIEGO-2026-ALLGYMS' } }),
    );
  });

  describe('checkAccess', () => {
    it('resolves a QR to the same rule the other methods use', async () => {
      prisma.membership.findUnique.mockResolvedValue(romaSurRow);

      const result = await service.checkAccess(CONDESA, { qrCode: 'ML-DIEGO-2026-ALLGYMS' });

      expect(result.outcome).toBe('valid');
    });

    it('resolves a fingerprint the same way', async () => {
      prisma.membership.findUnique.mockResolvedValue({ ...romaSurRow, fingerprintId: 'fp-1' });

      const result = await service.checkAccess(ROMA_SUR, { fingerprintId: 'fp-1' });

      expect(result.outcome).toBe('valid');
      expect(prisma.membership.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fingerprintId: 'fp-1' } }),
      );
    });

    // Solo la búsqueda por nombre puede producir 'ambiguous' — QR y huella son
    // llaves únicas.
    it('reports ambiguity when a name matches more than one member', async () => {
      prisma.membership.findMany.mockResolvedValue([
        romaSurRow,
        { ...romaSurRow, id: 'm2', accessCode: 'ML-QR-OTRO', user: { name: 'Diego Ramos', phone: '' } },
      ]);

      const result = await service.checkAccess(ROMA_SUR, { name: 'Diego' });

      expect(result.outcome).toBe('ambiguous');
      expect(result.outcome === 'ambiguous' && result.candidates).toHaveLength(2);
    });

    it('applies the access rule when a name matches exactly one member', async () => {
      prisma.membership.findMany.mockResolvedValue([
        { ...romaSurRow, tierKey: 'single', branchId: CONDESA, branch: { name: 'CONDESA' } },
      ]);

      const result = await service.checkAccess(ROMA_SUR, { name: 'Diego' });

      expect(result.outcome).toBe('wrong_branch');
    });

    it('returns not_found for an empty name instead of listing everyone', async () => {
      const result = await service.checkAccess(ROMA_SUR, { name: '   ' });

      expect(result).toEqual({ outcome: 'not_found' });
      expect(prisma.membership.findMany).not.toHaveBeenCalled();
    });
  });

  describe('renew', () => {
    const dto = { qrCode: 'ML-DIEGO-2026-ALLGYMS', tierKey: 'all' as const, periodKey: 'monthly' as const, paymentMethod: 'card' as const };

    // El mock de branch-app cobraba CURRENT_BRANCH_PRICE = 1090 fijo, así que
    // Santa Fe ($1390) cobraba precio de Roma Sur. Aquí el precio sale de la
    // sucursal que está cobrando.
    it('prices from the branch doing the charging, not from a fixed constant', async () => {
      prisma.membership.findUnique.mockResolvedValue(romaSurRow);
      prisma.branch.findUnique.mockResolvedValue({ id: 5, price: 1390 });
      prisma.membershipPayment.create.mockImplementation(({ data }: never) => ({
        ...(data as object),
        id: 'mp1',
        createdAt: new Date(),
      }));

      const payment = await service.renew(5, dto);

      expect(payment.amount).toBe(calculateMembershipPrice(1390, 'all', 'monthly'));
      expect(payment.amount).not.toBe(calculateMembershipPrice(1090, 'all', 'monthly'));
    });

    // Renovar puede mover al socio de tier y de sucursal — si la membresía no
    // se actualizara, el alcance de acceso seguiría siendo el del plan viejo.
    it('moves the membership to the new tier and branch, and clears grace', async () => {
      prisma.membership.findUnique.mockResolvedValue({ ...romaSurRow, status: 'grace', tierKey: 'single' });
      prisma.branch.findUnique.mockResolvedValue({ id: CONDESA, price: 1190 });
      prisma.membershipPayment.create.mockImplementation(({ data }: never) => ({
        ...(data as object), id: 'mp1', createdAt: new Date(),
      }));

      await service.renew(CONDESA, { ...dto, tierKey: 'all' });

      expect(prisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            graceEndsAt: null,
            tierKey: 'all',
            branchId: CONDESA,
          }),
        }),
      );
    });

    it('rejects a QR code that belongs to nobody', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.renew(ROMA_SUR, dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('records the payment as a renewal, not a new signup', async () => {
      prisma.membership.findUnique.mockResolvedValue(romaSurRow);
      prisma.branch.findUnique.mockResolvedValue({ id: ROMA_SUR, price: 1090 });
      prisma.membershipPayment.create.mockImplementation(({ data }: never) => ({
        ...(data as object), id: 'mp1', createdAt: new Date(),
      }));

      const payment = await service.renew(ROMA_SUR, dto);

      expect(payment.isNewMember).toBe(false);
    });
  });

  describe('signUp', () => {
    const dto = {
      memberName: 'Nuevo Socio',
      phone: '55 0000 0000',
      tierKey: 'single' as const,
      periodKey: 'monthly' as const,
      paymentMethod: 'cash' as const,
    };

    beforeEach(() => {
      prisma.branch.findUnique.mockResolvedValue({ id: ROMA_SUR, price: 1090 });
      prisma.user.create.mockResolvedValue({ id: 'u-new' });
      prisma.membership.create.mockImplementation(({ data }: never) => ({ ...(data as object), id: 'm-new' }));
      prisma.membershipPayment.create.mockImplementation(({ data }: never) => ({
        ...(data as object), id: 'mp-new', createdAt: new Date(),
      }));
    });

    // Un socio de mostrador no tiene la app: no hay cuenta de Cognito y puede
    // no tener correo. Eso es lo que hace nullable a cognitoSub/email.
    it('creates the member without a Cognito account or an email', async () => {
      await service.signUp(ROMA_SUR, dto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { name: 'Nuevo Socio', phone: '55 0000 0000' },
      });
    });

    it('always mints an access code, even when the signup is by fingerprint', async () => {
      await service.signUp(ROMA_SUR, { ...dto, fingerprintId: 'fp-9' });

      const created = prisma.membership.create.mock.calls[0][0].data as {
        accessCode: string;
        fingerprintId: string | null;
      };
      expect(created.accessCode).toMatch(/^ML-QR-[0-9A-F]{12}$/);
      expect(created.fingerprintId).toBe('fp-9');
    });

    it('mints a different access code every time', async () => {
      await service.signUp(ROMA_SUR, dto);
      await service.signUp(ROMA_SUR, dto);

      const [first, second] = prisma.membership.create.mock.calls.map(
        (call) => (call[0].data as { accessCode: string }).accessCode,
      );
      expect(first).not.toBe(second);
    });

    it('records the payment as a new signup, priced from the branch', async () => {
      const payment = await service.signUp(ROMA_SUR, dto);

      expect(payment.isNewMember).toBe(true);
      expect(payment.amount).toBe(calculateMembershipPrice(1090, 'single', 'monthly'));
    });

    it('creates member, membership and payment in one transaction', async () => {
      await service.signUp(ROMA_SUR, dto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
