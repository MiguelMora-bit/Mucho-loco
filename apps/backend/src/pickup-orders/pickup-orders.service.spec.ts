/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PickupOrdersService } from './pickup-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChargesService } from '../charges/charges.service';

const orderRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  branchId: 1,
  total: 2080,
  status: 'ready',
  paymentMethod: 'stripe',
  delivery: 'pickup',
  createdAt: new Date('2026-09-11T10:00:00.000Z'),
  deliveredAt: null,
  user: { name: 'Diego Ramírez' },
  items: [{ name: 'Pre-Entreno Bestia', flav: 'Mango Chamoy', img: '/a.jpg', qty: 1 }],
  ...overrides,
});

describe('PickupOrdersService', () => {
  let service: PickupOrdersService;
  let prisma: {
    order: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let charges: { recordOrder: jest.Mock };

  beforeEach(async () => {
    prisma = {
      order: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    charges = { recordOrder: jest.fn().mockResolvedValue(true) };
    const module = await Test.createTestingModule({
      providers: [
        PickupOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChargesService, useValue: charges },
      ],
    }).compile();
    service = module.get(PickupOrdersService);
  });

  // Mostrador solo distingue dos estados. Que el pedido además esté pendiente
  // de pago (efectivo al recoger) es asunto del cobro, no de la entrega.
  it('collapses the order status to ready or delivered', async () => {
    prisma.order.findMany.mockResolvedValue([
      orderRow({ id: 'a', status: 'ready' }),
      orderRow({ id: 'b', status: 'pending_payment', paymentMethod: 'cash' }),
      orderRow({ id: 'c', status: 'done' }),
    ]);

    const orders = await service.getByBranch(1);

    expect(orders.map((o) => o.status)).toEqual(['ready', 'ready', 'delivered']);
  });

  // Un checkout de Stripe abandonado también es pending_payment: para
  // mostrador no hay nada que entregar. El efectivo pendiente sí se lista.
  it('only lists pickup orders of that branch — no home deliveries, no unpaid online orders', async () => {
    prisma.order.findMany.mockResolvedValue([]);

    await service.getByBranch(3);

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          branchId: 3,
          delivery: 'pickup',
          OR: [{ status: { not: 'pending_payment' } }, { paymentMethod: 'cash' }],
        },
      }),
    );
  });

  it('shows the customer name, which the online order alone does not carry', async () => {
    prisma.order.findMany.mockResolvedValue([orderRow()]);

    const [order] = await service.getByBranch(1);

    expect(order.customerName).toBe('Diego Ramírez');
  });

  describe('markDelivered', () => {
    it('marks the order done and stamps the delivery time', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRow());
      prisma.order.update.mockResolvedValue(orderRow({ status: 'done', deliveredAt: new Date() }));

      const delivered = await service.markDelivered('o1');

      expect(delivered.status).toBe('delivered');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'done', deliveredAt: expect.any(Date) } }),
      );
    });

    // En efectivo, entregar ES cobrar: ése es el ingreso, y ése su momento.
    it('records the cash it collects as a charge, dated at delivery', async () => {
      prisma.order.findUnique.mockResolvedValue(
        orderRow({ paymentMethod: 'cash', status: 'pending_payment' }),
      );
      const delivered = orderRow({ paymentMethod: 'cash', status: 'done', deliveredAt: new Date() });
      prisma.order.update.mockResolvedValue(delivered);

      await service.markDelivered('o1');

      const stamped = (prisma.order.update.mock.calls[0][0] as { data: { deliveredAt: Date } }).data
        .deliveredAt;
      expect(charges.recordOrder).toHaveBeenCalledWith(prisma, delivered, {
        method: 'cash',
        paidAt: stamped,
      });
    });

    it('does not record an order paid online again — Stripe already did', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRow({ paymentMethod: 'stripe', status: 'ready' }));
      prisma.order.update.mockResolvedValue(orderRow({ status: 'done', deliveredAt: new Date() }));

      await service.markDelivered('o1');

      expect(charges.recordOrder).not.toHaveBeenCalled();
    });

    // Entregar dos veces movería deliveredAt, y con eso a qué turno de caja
    // pertenece el efectivo del pedido.
    it('refuses to deliver the same order twice', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRow({ status: 'done' }));

      await expect(service.markDelivered('o1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    // Antes se entregaba igual: salía sin cobrar y sin cobro en el registro.
    it('refuses to hand over an online order that was never paid', async () => {
      prisma.order.findUnique.mockResolvedValue(
        orderRow({ paymentMethod: 'stripe', status: 'pending_payment' }),
      );

      const error = await service.markDelivered('o1').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({ code: 'ORDER_NOT_PAID' });
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(charges.recordOrder).not.toHaveBeenCalled();
    });

    it('refuses to deliver a home-shipping order at a counter', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRow({ delivery: 'home', branchId: null }));

      await expect(service.markDelivered('o1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.markDelivered('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
