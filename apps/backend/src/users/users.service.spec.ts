/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`, no vale la pena tipar Prisma.OrderCreateArgs solo para reconstruir el valor de retorno del mock. */
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOrderDto } from './dto/create-order.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    membership: { findUnique: jest.Mock };
    visit: { findMany: jest.Mock };
    order: { findMany: jest.Mock; create: jest.Mock };
    product: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      membership: { findUnique: jest.fn() },
      visit: { findMany: jest.fn() },
      order: { findMany: jest.fn(), create: jest.fn() },
      product: { findMany: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
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

      const user = await service.findOrCreateByCognito({
        sub: 'sub-1',
        email: 'diego@mucholoco.mx',
        name: 'Diego',
      });

      expect(user.id).toBe('u1');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // Antes nacía con una mensual de 15 sucursales regalada. Ahora la
    // membresía existe desde el primer cobro (MembershipBillingService), así
    // que aquí solo se crea el socio.
    it('auto-provisions a new user on first sight, without a membership', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-1',
        email: 'nuevo@mucholoco.mx',
      });

      const user = await service.findOrCreateByCognito({
        sub: 'sub-2',
        email: 'nuevo@mucholoco.mx',
        name: '',
      });

      expect(user.id).toBe('new-1');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cognitoSub: 'sub-2',
            name: 'NUEVO',
            phone: '',
          }),
        }),
      );
    });

    // Un socio dado de alta en mostrador (sin cuenta de acceso) que después se
    // instala la app: se le liga la cuenta y CONSERVA su membresía, sus
    // visitas y sus pedidos. Crear una fila nueva le borraría su historia.
    it('links the account to a counter-created member who now installed the app', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // por cognitoSub
        .mockResolvedValueOnce({
          id: 'counter-1',
          email: 'socio@mucholoco.mx',
          cognitoSub: null,
          name: 'SOCIO DE MOSTRADOR',
        });
      prisma.user.update.mockResolvedValue({ id: 'counter-1' });

      const user = await service.findOrCreateByCognito({
        sub: 'sub-3',
        email: 'socio@mucholoco.mx',
        name: 'Socio',
      });

      expect(user.id).toBe('counter-1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'counter-1' },
        data: { cognitoSub: 'sub-3', name: 'SOCIO DE MOSTRADOR' },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // Tomar la cuenta en silencio dejaría fuera al dueño original. Pasa al
    // recrear el User Pool: los socios viejos quedan con un sub que ya no
    // existe (ver "Nota operativa" en el CLAUDE.md raíz).
    it('refuses to take over an email that already belongs to another login', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'u1',
        email: 'diego@mucholoco.mx',
        cognitoSub: 'sub-viejo',
      });

      await expect(
        service.findOrCreateByCognito({
          sub: 'sub-nuevo',
          email: 'diego@mucholoco.mx',
          name: 'Diego',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // El otro lado del caso anterior, y lo que destapó el e2e de requests
    // paralelas: una request paralela del MISMO socio lo creó entre la
    // búsqueda por sub y la búsqueda por correo. No es otra cuenta: es él.
    it('recognizes itself when a parallel request linked the email to the same sub', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'same-1',
        email: 'nuevo@mucholoco.mx',
        cognitoSub: 'sub-mismo',
        phone: '',
      });

      const user = await service.findOrCreateByCognito({
        sub: 'sub-mismo',
        email: 'nuevo@mucholoco.mx',
        name: 'Nuevo',
      });

      expect(user.id).toBe('same-1');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // Un socio de mostrador puede no tener correo; buscar por `email: ''`
    // encontraría a cualquier otro sin correo y los mezclaría.
    it('does not look up by an empty email', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValue({ id: 'new-2' });

      await service.findOrCreateByCognito({
        sub: 'sub-4',
        email: '',
        name: 'Alguien',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      // "Sin correo" se guarda como null: la columna es UNIQUE y la cadena
      // vacía solo cabe una vez.
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: null }),
        }),
      );
    });

    // mobile-app pide teléfono al registrarse y viaja en el ID token
    // (`phone_number`). Sin él no hay avisos de WhatsApp.
    it('stores the phone from the token when provisioning a new member', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'new-3' });

      await service.findOrCreateByCognito({
        sub: 'sub-5',
        email: 'tel@mucholoco.mx',
        name: 'Tel',
        phone: '+525512345678',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: '+525512345678' }),
        }),
      );
    });

    it('backfills the phone of an existing member who did not have one', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', phone: '' });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        phone: '+525512345678',
      });

      const user = await service.findOrCreateByCognito({
        sub: 'sub-1',
        email: 'diego@mucholoco.mx',
        name: 'Diego',
        phone: '+525512345678',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { phone: '+525512345678' },
      });
      expect(user.phone).toBe('+525512345678');
    });

    it('never overwrites a phone the member already has', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        phone: '+525500000000',
      });

      await service.findOrCreateByCognito({
        sub: 'sub-1',
        email: 'diego@mucholoco.mx',
        name: 'Diego',
        phone: '+525512345678',
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    // Varias requests del mismo socio nuevo al mismo tiempo: gana un insert,
    // los demás chocan con el índice único y leen al ganador.
    it('returns the winner when a parallel first request already created the member', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'winner' });

      const user = await service.findOrCreateByCognito({
        sub: 'sub-6',
        email: 'race@mucholoco.mx',
        name: 'Race',
      });

      expect(user.id).toBe('winner');
      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-6' },
      });
    });

    it('does not swallow errors that are not a unique violation', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValueOnce(new Error('connection lost'));

      await expect(
        service.findOrCreateByCognito({
          sub: 'sub-7',
          email: 'x@y.mx',
          name: 'X',
        }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('createOrder', () => {
    const dto = (overrides: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
      items: [{ productId: 'p7', qty: 2 }],
      paymentMethod: 'cash',
      delivery: 'pickup',
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
      prisma.membership.findUnique.mockResolvedValue({ branchId: 1 });
      prisma.order.create.mockImplementation(({ data }) =>
        Promise.resolve({
          ...data,
          id: 'order-1',
          createdAt: new Date(),
          items: data.items.create,
          branch: { name: 'ROMA SUR' },
        }),
      );
    });

    it('computes total from real catalog prices server-side, ignoring anything the client might have claimed', async () => {
      const order = await service.createOrder('user-1', dto());
      // 2 * 790 = 1580 — nunca viene del cliente, el DTO no tiene campo `total`.
      expect(order.total).toBe(1580);
    });

    // Sin pasarela no se cobra nada: el pedido queda pendiente hasta que
    // mostrador cobra el efectivo al entregarlo.
    it('leaves a cash order pending payment until the counter collects it', async () => {
      const order = await service.createOrder('user-1', dto());
      expect(order.status).toBe('pending_payment');
    });

    it('is picked up at the branch of the membership', async () => {
      await service.createOrder('user-1', dto());
      expect(prisma.order.create.mock.calls[0][0].data.branchId).toBe(1);
    });

    // Antes esta ruta aceptaba tarjeta, transferencia, Mercado Pago y PayPal
    // y creaba el pedido como pagado sin cobrar nada.
    it('never creates an order as paid: online methods have to go through Stripe', async () => {
      for (const method of ['card', 'transfer', 'paypal', 'mercadopago']) {
        await expect(
          service.createOrder(
            'user-1',
            dto({ paymentMethod: method as unknown as CreateOrderDto['paymentMethod'] }),
          ),
        ).rejects.toThrow(BadRequestException);
      }
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects cash combined with home delivery — home orders are paid through Stripe', async () => {
      await expect(
        service.createOrder('user-1', dto({ delivery: 'home' })),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    // "Recoger en gym" sale de la sucursal de la membresía. Un socio recién
    // registrado ya no nace con una, así que ese caso tiene que dar un 400
    // explicado, no un 500 de Prisma.
    it('rejects a pickup order from a member without a membership', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);
      await expect(service.createOrder('user-1', dto())).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
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
  });
});
