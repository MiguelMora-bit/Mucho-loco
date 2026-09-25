/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

const day = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    charge: { findMany: jest.Mock; groupBy: jest.Mock };
    counterSale: { findMany: jest.Mock };
    branch: { findMany: jest.Mock };
    membership: { groupBy: jest.Mock };
    visit: { groupBy: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      charge: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
      counterSale: { findMany: jest.fn().mockResolvedValue([]) },
      branch: { findMany: jest.fn().mockResolvedValue([]) },
      membership: { groupBy: jest.fn().mockResolvedValue([]) },
      visit: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const module = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ReportsService);
  });

  describe('getSalesReport', () => {
    // Antes se sumaban tres tablas a mano y lo cobrado en línea no entraba.
    it('adds every charge of the branch into one revenue figure, whatever the channel', async () => {
      prisma.charge.findMany.mockResolvedValue([
        { totalCents: 158000, paidAt: day('2026-09-10') }, // venta de mostrador
        { totalCents: 164000, paidAt: day('2026-09-10') }, // membresía de mostrador
        { totalCents: 29000, paidAt: day('2026-09-11') }, // pedido recogido
        { totalCents: 109000, paidAt: day('2026-09-11') }, // membresía contratada en línea
      ]);

      const report = await service.getSalesReport(1, 7);

      expect(report.totalRevenue).toBe(1580 + 1640 + 290 + 1090);
      expect(report.transactionCount).toBe(4);
    });

    it('reads only the charges of that branch inside the window', async () => {
      await service.getSalesReport(3, 7);

      expect(prisma.charge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { branchId: 3, paidAt: { gte: expect.any(Date) } } }),
      );
    });

    it('groups revenue by day, sorted oldest first, with no zero-filled gaps', async () => {
      prisma.charge.findMany.mockResolvedValue([
        { totalCents: 10000, paidAt: day('2026-09-11') },
        { totalCents: 20000, paidAt: day('2026-09-09') },
        { totalCents: 5000, paidAt: day('2026-09-09') },
      ]);

      const report = await service.getSalesReport(1, 7);

      expect(report.byDay).toEqual([
        { date: '2026-09-09', revenue: 250 },
        { date: '2026-09-11', revenue: 100 },
      ]);
    });

    // Una renovación de Stripe con prorrateo puede traer centavos.
    it('keeps the centavos instead of rounding them away', async () => {
      prisma.charge.findMany.mockResolvedValue([
        { totalCents: 109050, paidAt: day('2026-09-10') },
        { totalCents: 25, paidAt: day('2026-09-10') },
      ]);

      const report = await service.getSalesReport(1, 7);

      expect(report.totalRevenue).toBe(1090.75);
      expect(report.byDay).toEqual([{ date: '2026-09-10', revenue: 1090.75 }]);
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
    // central — ninguno de los dos pertenece al ranking de mostrador, aunque
    // sí sumen al ingreso.
    it('keeps memberships and online orders out of the top-products ranking', async () => {
      prisma.charge.findMany.mockResolvedValue([
        { totalCents: 164000, paidAt: day('2026-09-10') },
        { totalCents: 29000, paidAt: day('2026-09-10') },
      ]);

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

    it('derives revenue per branch from the charges ledger', async () => {
      prisma.charge.groupBy.mockResolvedValue([
        { branchId: 1, _sum: { totalCents: 693000 } },
        // Envíos a domicilio: salen de bodega, no son de ninguna sucursal.
        { branchId: null, _sum: { totalCents: 138900 } },
      ]);

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

    // Spec 014: hoy (día de CDMX) y la ventana, de las entradas registradas.
    it('counts check-ins per branch for today and for the window', async () => {
      prisma.visit.groupBy
        .mockResolvedValueOnce([{ branchId: 1, _count: { _all: 42 } }])
        .mockResolvedValueOnce([{ branchId: 1, _count: { _all: 900 } }, { branchId: 2, _count: { _all: 15 } }]);

      const [romaSur, romaNorte] = await service.getBranchStats();

      expect(romaSur).toMatchObject({ checkInsToday: 42, checkIns: 900 });
      expect(romaNorte).toMatchObject({ checkInsToday: 0, checkIns: 15 });
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
      expect(prisma.visit.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { visitDay: new Date(`${today}T00:00:00.000Z`) } }),
      );
    });
  });
});
