/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { PrismaService } from '../prisma/prisma.service';

const ADDRESS = {
  street: 'Av. Insurgentes Sur 1234',
  neighborhood: 'Roma Sur',
  city: 'Cuauhtémoc',
  state: 'CDMX',
  postalCode: '06760',
  phone: '+525512345678',
};

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    delivery: 'home',
    status: 'ready',
    total: 1389,
    createdAt: new Date('2026-09-14T10:00:00.000Z'),
    shippedAt: null,
    deliveredAt: null,
    trackingNumber: null,
    shippingAddress: ADDRESS,
    items: [{ name: 'Whey Protein 5LBS', flav: 'Fresa', img: '/assets/whey.jpg', qty: 1 }],
    user: { name: 'DIEGO RAMÍREZ' },
    ...overrides,
  };
}

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let prisma: { order: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(row()),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(row(data))),
      },
    };
    const module = await Test.createTestingModule({
      providers: [ShipmentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ShipmentsService);
  });

  const codeOf = (promise: Promise<unknown>) =>
    promise.then(
      () => null,
      (e: { response?: { code?: string } }) => e.response?.code ?? e,
    );

  describe('getAll', () => {
    // Una sesión de Stripe sin pagar también es un pedido a domicilio:
    // mandarlo sería regalarlo.
    it('lists only paid home orders, the oldest first', async () => {
      await service.getAll();

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { delivery: 'home', status: { in: ['ready', 'shipped', 'done'] } },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('shows the warehouse what it needs: who, what, and where', async () => {
      prisma.order.findMany.mockResolvedValue([row()]);

      const [shipment] = await service.getAll();

      expect(shipment).toMatchObject({
        id: 'order-1',
        customerName: 'DIEGO RAMÍREZ',
        status: 'to_ship',
        address: ADDRESS,
        total: 1389,
      });
    });
  });

  describe('markShipped', () => {
    it('ships a paid order with its tracking number', async () => {
      const shipment = await service.markShipped('order-1', ' 1Z999AA1 ');

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1' },
          data: expect.objectContaining({ status: 'shipped', trackingNumber: '1Z999AA1' }),
        }),
      );
      expect(shipment.status).toBe('shipped');
    });

    it('ships without a tracking number too', async () => {
      await service.markShipped('order-1');

      expect(prisma.order.update.mock.calls[0][0].data.trackingNumber).toBeNull();
    });

    it('never ships an order that has not been paid', async () => {
      prisma.order.findUnique.mockResolvedValue(row({ status: 'pending_payment' }));

      expect(await codeOf(service.markShipped('order-1'))).toBe('ORDER_NOT_PAID');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('refuses to ship twice', async () => {
      prisma.order.findUnique.mockResolvedValue(row({ status: 'shipped' }));

      expect(await codeOf(service.markShipped('order-1'))).toBe('ORDER_ALREADY_SHIPPED');
    });

    it('refuses a pickup order — that one goes out through the branch counter', async () => {
      prisma.order.findUnique.mockResolvedValue(row({ delivery: 'pickup' }));

      expect(await codeOf(service.markShipped('order-1'))).toBe('NOT_A_HOME_ORDER');
    });

    it('404s an order that does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.markShipped('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('markDelivered', () => {
    it('delivers what was shipped', async () => {
      prisma.order.findUnique.mockResolvedValue(row({ status: 'shipped' }));

      const shipment = await service.markDelivered('order-1');

      expect(prisma.order.update.mock.calls[0][0].data.status).toBe('done');
      expect(shipment.status).toBe('delivered');
    });

    it('refuses to deliver what never left the warehouse', async () => {
      expect(await codeOf(service.markDelivered('order-1'))).toBe('ORDER_NOT_SHIPPED');
    });

    it('refuses to deliver twice', async () => {
      prisma.order.findUnique.mockResolvedValue(row({ status: 'done' }));

      expect(await codeOf(service.markDelivered('order-1'))).toBe('ORDER_ALREADY_DELIVERED');
    });
  });
});
