/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

const day = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    counterSale: { findMany: jest.Mock; groupBy: jest.Mock };
    membershipPayment: { findMany: jest.Mock; groupBy: jest.Mock };
    order: { findMany: jest.Mock; groupBy: jest.Mock };
    branch: { findMany: jest.Mock };
    membership: { groupBy: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      counterSale: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
      membershipPayment: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
      order: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
      branch: { findMany: jest.fn().mockResolvedValue([]) },
      membership: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const module = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ReportsService);
  });

  describe('getSalesReport', () => {
    it('adds counter sales, membership payments and picked-up orders into one revenue figure', async () => {
      prisma.counterSale.findMany.mockResolvedValue([
        { total: 1580, createdAt: day('2026-09-10'), items: [] },
      ]);
      prisma.membershipPayment.findMany.mockResolvedValue([
        { amount: 1640, createdAt: day('2026-09-10') },
      ]);
      prisma.order.findMany.mockResolvedValue([{ total: 290, deliveredAt: day('2026-09-11') }]);

      const report = await service.getSalesReport(1, 7);

      expect(report.totalRevenue).toBe(1580 + 1640 + 290);
      expect(report.transactionCount).toBe(3);
    });

    it('groups revenue by day, sorted oldest first, with no zero-filled gaps', async () => {
      prisma.counterSale.findMany.mockResolvedValue([
        { total: 100, createdAt: day('2026-09-11'), items: [] },
        { total: 200, createdAt: day('2026-09-09'), items: [] },
        { total: 50, createdAt: day('2026-09-09'), items: [] },
      ]);

      const report = await service.getSalesReport(1, 7);

      expect(report.byDay).toEqual([
        { date: '2026-09-09', revenue: 250 },
        { date: '2026-09-11', revenue: 100 },
      ]);
    });

    // Un pedido recogido cuenta el día que se ENTREGÓ, no el que se hizo: el
    // dinero (y el movimiento en la sucursal) ocurre al recoger.
    it('dates a picked-up order by its delivery, not by when it was placed', async () => {
      prisma.order.findMany.mockResolvedValue([
        { total: 290, createdAt: day('2026-09-01'), deliveredAt: day('2026-09-11') },
      ]);

      const report = await service.getSalesReport(1, 7);

      expect(report.byDay).toEqual([{ date: '2026-09-11', revenue: 290 }]);
    });

    it('ranks top products by units sold and caps the list at five', async () => {
      prisma.counterSale.findMany.mockResolvedValue([
        {
          total: 0,
          createdAt: day('2026-09-10'),
          items: [
            { productId: 'p7', productName: 'Pre', qty: 2, unitPrice: 790 },
            { productId: 'p9', productName: 'Energy', qty: 10, unitPrice: 45 },
          ],
        },
        {
          total: 0,
          createdAt: day('2026-09-11'),
          items: [
            { productId: 'p7', productName: 'Pre', qty: 1, unitPrice: 790 },
            { productId: 'p1', productName: 'Whey', qty: 1, unitPrice: 1290 },
            { productId: 'p13', productName: 'Gomitas', qty: 1, unitPrice: 95 },
            { productId: 'p18', productName: 'Shaker', qty: 1, unitPrice: 290 },
            { productId: 'p11', productName: 'BCAA', qty: 1, unitPrice: 690 },
          ],
        },
      ]);

      const report = await service.getSalesReport(1, 7);

      expect(report.topProducts).toHaveLength(5);
      expect(report.topProducts[0]).toEqual({
        productId: 'p9', productName: 'Energy', qtySold: 10, revenue: 450,
      });
      // Las dos ventas del mismo producto se acumulan en una sola fila.
      expect(report.topProducts[1]).toEqual({
        productId: 'p7', productName: 'Pre', qtySold: 3, revenue: 2370,
      });
    });

    // Una membresía no es un producto, y un pedido en línea salió de la bodega
    // central — ninguno de los dos pertenece al ranking de mostrador.
    it('keeps memberships and online orders out of the top-products ranking', async () => {
      prisma.membershipPayment.findMany.mockResolvedValue([{ amount: 1640, createdAt: day('2026-09-10') }]);
      prisma.order.findMany.mockResolvedValue([{ total: 290, deliveredAt: day('2026-09-10') }]);

      const report = await service.getSalesReport(1, 7);

      expect(report.topProducts).toEqual([]);
      expect(report.totalRevenue).toBe(1930);
    });

    it('returns an empty report rather than failing when nothing happened', async () => {
      const report = await service.getSalesReport(9, 30);

      expect(report).toEqual({
        branchId: 9, days: 30, totalRevenue: 0, transactionCount: 0, byDay: [], topProducts: [],
      });
    });
  });

  describe('getBranchStats', () => {
    beforeEach(() => {
      prisma.branch.findMany.mockResolvedValue([
        { id: 1, name: 'ROMA SUR' },
        { id: 2, name: 'ROMA NORTE' },
      ]);
    });

    it('derives revenue per branch from its three income sources', async () => {
      prisma.counterSale.groupBy.mockResolvedValue([{ branchId: 1, _sum: { total: 5000 } }]);
      prisma.membershipPayment.groupBy.mockResolvedValue([{ branchId: 1, _sum: { amount: 1640 } }]);
      prisma.order.groupBy.mockResolvedValue([{ branchId: 1, _sum: { total: 290 } }]);

      const [romaSur, romaNorte] = await service.getBranchStats();

      expect(romaSur).toMatchObject({ branchId: 1, branchName: 'ROMA SUR', revenue: 6930 });
      // Una sucursal sin movimiento aparece en cero, no se omite de la lista.
      expect(romaNorte).toMatchObject({ branchId: 2, revenue: 0, activeCustomers: 0 });
    });

    // Un socio en periodo de gracia sigue entrando al gimnasio, así que sigue
    // contando como cliente activo (ver CLAUDE.md raíz).
    it('counts members in grace period as active customers', async () => {
      prisma.membership.groupBy.mockResolvedValue([{ branchId: 1, _count: { _all: 312 } }]);

      const [romaSur] = await service.getBranchStats();

      expect(romaSur.activeCustomers).toBe(312);
      expect(prisma.membership.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: { in: ['active', 'grace'] } } }),
      );
    });
  });
});
