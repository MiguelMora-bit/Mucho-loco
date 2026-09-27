/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { PrismaService } from '../prisma/prisma.service';

const OPENED = new Date('2026-09-12T14:00:00.000Z');

describe('CashRegisterService', () => {
  let service: CashRegisterService;
  let prisma: {
    cashRegisterShift: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    counterSale: { findMany: jest.Mock };
    membershipPayment: { findMany: jest.Mock };
    order: { findMany: jest.Mock };
  };

  const openShift = { id: 's1', branchId: 1, openedAt: OPENED, closedAt: null, status: 'open' };

  beforeEach(async () => {
    prisma = {
      cashRegisterShift: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      counterSale: { findMany: jest.fn().mockResolvedValue([]) },
      membershipPayment: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const module = await Test.createTestingModule({
      providers: [CashRegisterService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(CashRegisterService);
  });

  describe('getOpenShift', () => {
    it('returns the branch shift already open instead of opening another', async () => {
      prisma.cashRegisterShift.findFirst.mockResolvedValue(openShift);

      const shift = await service.getOpenShift(1);

      expect(shift.id).toBe('s1');
      expect(prisma.cashRegisterShift.create).not.toHaveBeenCalled();
    });

    it('opens one when the branch has none', async () => {
      prisma.cashRegisterShift.findFirst.mockResolvedValueOnce(null);
      prisma.cashRegisterShift.create.mockResolvedValue(openShift);

      const shift = await service.getOpenShift(1);

      expect(shift.status).toBe('open');
      expect(prisma.cashRegisterShift.create).toHaveBeenCalled();
    });

    // Dos cajeros entrando a la vez: el índice único parcial de la migración
    // hace fallar al segundo insert, y este camino lee el turno que ganó en
    // vez de propagar el error.
    it('falls back to the winning shift when a concurrent insert loses the race', async () => {
      prisma.cashRegisterShift.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...openShift, id: 's-winner' });
      prisma.cashRegisterShift.create.mockRejectedValue(new Error('unique violation'));

      const shift = await service.getOpenShift(1);

      expect(shift.id).toBe('s-winner');
    });
  });

  describe('getTransactions', () => {
    it('merges counter sales and membership payments into one timeline, newest first', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(openShift);
      prisma.counterSale.findMany.mockResolvedValue([
        {
          id: 'cs1',
          total: 1580,
          paymentMethod: 'card',
          createdAt: new Date('2026-09-12T15:00:00.000Z'),
          items: [{ qty: 2, productName: 'Pre-Entreno Bestia · Mango Chamoy' }],
        },
      ]);
      prisma.membershipPayment.findMany.mockResolvedValue([
        {
          id: 'mp1',
          amount: 1640,
          paymentMethod: 'cash',
          isNewMember: true,
          memberName: 'Nuevo Socio',
          createdAt: new Date('2026-09-12T16:00:00.000Z'),
        },
      ]);

      const transactions = await service.getTransactions('s1');

      expect(transactions.map((t) => t.kind)).toEqual(['membership', 'sale']);
      expect(transactions[0].description).toBe('Alta — Nuevo Socio');
      expect(transactions[1].description).toBe('2x Pre-Entreno Bestia · Mango Chamoy');
    });

    it('labels a renewal differently from a signup', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(openShift);
      prisma.membershipPayment.findMany.mockResolvedValue([
        { id: 'mp1', amount: 1640, paymentMethod: 'cash', isNewMember: false, memberName: 'Diego', createdAt: new Date() },
      ]);

      const [tx] = await service.getTransactions('s1');

      expect(tx.description).toBe('Renovación — Diego');
    });

    // Un turno abierto cuenta hasta ahora; uno cerrado, hasta su cierre — si no,
    // una venta posterior al corte se colaría en un corte ya cuadrado.
    it('bounds a closed shift by its closing time, not by now', async () => {
      const closedAt = new Date('2026-09-12T22:00:00.000Z');
      prisma.cashRegisterShift.findUnique.mockResolvedValue({ ...openShift, closedAt, status: 'closed' });

      await service.getTransactions('s1');

      expect(prisma.counterSale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { branchId: 1, createdAt: { gte: OPENED, lte: closedAt } },
        }),
      );
    });

    // Efectivo cobrado al entregar un pedido de la tienda: entra al cajón de
    // la sucursal, así que tiene que salir en el corte. Uno pagado con tarjeta
    // en línea no — ese dinero nunca tocó esta caja.
    it('counts a cash pickup order as money entering the register', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(openShift);
      prisma.order.findMany.mockResolvedValue([
        {
          id: 'o1',
          total: 2080,
          deliveredAt: new Date('2026-09-12T17:00:00.000Z'),
          user: { name: 'Diego Ramírez' },
          items: [],
        },
      ]);

      const [tx] = await service.getTransactions('s1');

      expect(tx).toMatchObject({
        kind: 'pickup',
        amount: 2080,
        paymentMethod: 'cash',
        description: 'Pedido en efectivo — Diego Ramírez',
      });
    });

    it('only looks at cash pickups already delivered inside the window', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(openShift);

      await service.getTransactions('s1');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            delivery: 'pickup',
            paymentMethod: 'cash',
            status: 'done',
          }),
        }),
      );
    });

    it('rejects an unknown shift', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(null);

      await expect(service.getTransactions('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('closeShift', () => {
    const NOW = new Date('2026-09-12T22:00:00.000Z');
    const manager = { name: 'Ana Sofía Martínez', email: 'ana@mucholoco.mx' };

    beforeEach(() => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(openShift);
      prisma.cashRegisterShift.updateMany.mockResolvedValue({ count: 1 });
      prisma.cashRegisterShift.findUniqueOrThrow.mockResolvedValue({
        ...openShift,
        status: 'closed',
        closedAt: NOW,
        countedCash: 1000,
        cashTotal: 1090,
        closedByName: manager.name,
      });
      prisma.counterSale.findMany.mockResolvedValue([
        { id: 'cs1', total: 290, paymentMethod: 'card', createdAt: OPENED, items: [] },
      ]);
      prisma.membershipPayment.findMany.mockResolvedValue([
        { id: 'mp1', amount: 1090, paymentMethod: 'cash', isNewMember: true, memberName: 'X', createdAt: OPENED },
      ]);
    });

    // Spec 052: el arqueo, los totales y quién cerró quedan congelados.
    it('freezes the count, the totals and who closed it', async () => {
      const closed = await service.closeShift('s1', 1000, manager, NOW);

      expect(prisma.cashRegisterShift.updateMany).toHaveBeenCalledWith({
        where: { id: 's1', status: 'open' },
        data: {
          status: 'closed',
          closedAt: NOW,
          countedCash: 1000,
          cashTotal: 1090,
          cardTotal: 290,
          transferTotal: 0,
          transactionCount: 2,
          closedByName: 'Ana Sofía Martínez',
          closedByEmail: 'ana@mucholoco.mx',
        },
      });
      expect(closed).toMatchObject({ status: 'closed', countedCash: 1000, expectedCash: 1090, closedBy: manager.name });
    });

    it('counts the window up to the closing instant', async () => {
      await service.closeShift('s1', 1000, manager, NOW);

      expect(prisma.counterSale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { branchId: 1, createdAt: { gte: OPENED, lte: NOW } } }),
      );
    });

    // Cerrar dos veces movería closedAt y con eso la ventana del corte ya
    // auditado — por eso 'closed' es final.
    it('refuses to close an already closed shift', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue({ ...openShift, status: 'closed' });

      await expect(service.closeShift('s1', 0, manager)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.cashRegisterShift.updateMany).not.toHaveBeenCalled();
    });

    it('loses a simultaneous close without overwriting the first count', async () => {
      prisma.cashRegisterShift.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.closeShift('s1', 0, manager)).rejects.toMatchObject({
        response: { code: 'SHIFT_ALREADY_CLOSED' },
      });
    });

    it('rejects an unknown shift', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(null);

      await expect(service.closeShift('nope', 0, manager)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getAudit', () => {
    const range = { from: new Date('2026-09-01T06:00:00.000Z'), to: new Date('2026-10-01T06:00:00.000Z') };
    const closedRow = {
      ...openShift,
      status: 'closed',
      closedAt: new Date('2026-09-12T22:00:00.000Z'),
      countedCash: 1000,
      cashTotal: 1090,
      cardTotal: 290,
      transferTotal: 0,
      transactionCount: 2,
      closedByName: 'Ana',
      closedByEmail: 'ana@mucholoco.mx',
      branch: { name: 'ROMA SUR' },
    };

    it('lists the closed shifts of the month with the count difference', async () => {
      prisma.cashRegisterShift.findMany.mockResolvedValue([closedRow]);

      const [audit] = await service.getAudit(range);

      expect(prisma.cashRegisterShift.findMany).toHaveBeenCalledWith({
        where: { status: 'closed', closedAt: { gte: range.from, lt: range.to } },
        include: { branch: true },
        orderBy: { closedAt: 'desc' },
      });
      expect(audit).toMatchObject({
        branchName: 'ROMA SUR',
        totals: { cash: 1090, card: 290, transfer: 0 },
        countedCash: 1000,
        difference: -90,
      });
    });

    it('narrows to one branch when asked', async () => {
      prisma.cashRegisterShift.findMany.mockResolvedValue([]);

      await service.getAudit(range, 3);

      expect(prisma.cashRegisterShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ branchId: 3 }) }),
      );
    });

    // Un corte cerrado antes del arqueo no congeló nada: no se inventan cifras.
    it('lists a shift closed before counting existed without totals', async () => {
      prisma.cashRegisterShift.findMany.mockResolvedValue([
        { ...closedRow, countedCash: null, cashTotal: null, cardTotal: null, transferTotal: null, transactionCount: null },
      ]);

      const [audit] = await service.getAudit(range);

      expect(audit).toMatchObject({ totals: null, countedCash: null, difference: null });
    });
  });

  it('getHistory only returns closed shifts of that branch', async () => {
    prisma.cashRegisterShift.findMany.mockResolvedValue([]);

    await service.getHistory(3);

    expect(prisma.cashRegisterShift.findMany).toHaveBeenCalledWith({
      where: { branchId: 3, status: 'closed' },
      orderBy: { closedAt: 'desc' },
    });
  });
});
