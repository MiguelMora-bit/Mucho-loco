/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`, no vale la pena tipar Prisma.OrderCreateArgs solo para reconstruir el valor de retorno del mock. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';
import type { CreateOrderDto } from './dto/create-order.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    membership: { findUniqueOrThrow: jest.Mock };
    visit: { findMany: jest.Mock };
    order: { findMany: jest.Mock; create: jest.Mock };
    product: { findMany: jest.Mock };
  };
  let memberships: { createDefaultForUser: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      membership: { findUniqueOrThrow: jest.fn() },
      visit: { findMany: jest.fn() },
      order: { findMany: jest.fn(), create: jest.fn() },
      product: { findMany: jest.fn() },
    };
    memberships = { createDefaultForUser: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipsService, useValue: memberships },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  describe('findOrCreateByCognito', () => {
    it('returns the existing user without creating a new one', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'diego@mucholoco.mx',
      });

      const user = await service.findOrCreateByCognito(
        'sub-1',
        'diego@mucholoco.mx',
        'Diego',
      );

      expect(user.id).toBe('u1');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(memberships.createDefaultForUser).not.toHaveBeenCalled();
    });

    it('auto-provisions a new user and a default membership on first sight', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-1',
        email: 'nuevo@mucholoco.mx',
      });

      const user = await service.findOrCreateByCognito(
        'sub-2',
        'nuevo@mucholoco.mx',
        '',
      );

      expect(user.id).toBe('new-1');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cognitoSub: 'sub-2', name: 'NUEVO' }),
        }),
      );
      expect(memberships.createDefaultForUser).toHaveBeenCalledWith('new-1');
    });
  });

  describe('createOrder', () => {
    const dto = (overrides: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
      items: [{ productId: 'p7', qty: 2 }],
      paymentMethod: 'card',
      delivery: 'home',
      lang: 'es',
      ...overrides,
    });

    beforeEach(() => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p7',
          name: { es: 'Pre-Entreno Bestia', en: 'Beast Pre-Workout' },
          flav: { es: 'Mango Chamoy', en: 'Mango Chamoy' },
          img: '/img.jpg',
          price: 790,
        },
      ]);
      prisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({
          ...data,
          id: 'order-1',
          createdAt: new Date(),
          items: data.items.create,
          branch: null,
        }),
      );
    });

    it('computes total from real catalog prices server-side, ignoring anything the client might have claimed', async () => {
      const order = await service.createOrder('user-1', dto());
      // 2 * 790 + 99 (envío a domicilio) = 1679 — nunca viene del cliente, el DTO no tiene campo `total`.
      expect(order.total).toBe(1679);
    });

    it('does not charge shipping for pickup', async () => {
      prisma.membership.findUniqueOrThrow.mockResolvedValue({ branchId: 1 });
      const order = await service.createOrder(
        'user-1',
        dto({ delivery: 'pickup' }),
      );
      expect(order.total).toBe(1580); // 2 * 790, sin envío
    });

    it('freezes the item name/flav in the requested language', async () => {
      const order = await service.createOrder('user-1', dto({ lang: 'en' }));
      expect(order.items[0].name).toBe('Beast Pre-Workout');
    });

    it('rejects an order for a product that does not exist', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await expect(service.createOrder('user-1', dto())).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects cash payment combined with home delivery', async () => {
      await expect(
        service.createOrder(
          'user-1',
          dto({ paymentMethod: 'cash', delivery: 'home' }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('allows cash payment for pickup, but leaves it pending payment until collected in person', async () => {
      prisma.membership.findUniqueOrThrow.mockResolvedValue({ branchId: 1 });
      const order = await service.createOrder(
        'user-1',
        dto({ paymentMethod: 'cash', delivery: 'pickup' }),
      );
      expect(order.status).toBe('pending_payment');
    });

    it('marks non-cash orders ready immediately, since they were already charged online', async () => {
      prisma.membership.findUniqueOrThrow.mockResolvedValue({ branchId: 1 });
      const order = await service.createOrder(
        'user-1',
        dto({ paymentMethod: 'card', delivery: 'pickup' }),
      );
      expect(order.status).toBe('ready');
    });
  });
});
