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
    it('closes an open shift and stamps the time', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(openShift);
      prisma.cashRegisterShift.update.mockResolvedValue({
        ...openShift,
        status: 'closed',
        closedAt: new Date('2026-09-12T22:00:00.000Z'),
      });

      const closed = await service.closeShift('s1');

      expect(closed.status).toBe('closed');
      expect(closed.closedAt).not.toBeNull();
    });

    // Cerrar dos veces movería closedAt y con eso la ventana del corte ya
    // auditado — por eso 'closed' es final.
    it('refuses to close an already closed shift', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue({ ...openShift, status: 'closed' });

      await expect(service.closeShift('s1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.cashRegisterShift.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown shift', async () => {
      prisma.cashRegisterShift.findUnique.mockResolvedValue(null);

      await expect(service.closeShift('nope')).rejects.toBeInstanceOf(NotFoundException);
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
