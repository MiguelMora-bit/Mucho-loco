/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { WhatsAppService, normalizePhone } from './whatsapp.provider';
import { PrismaService } from '../prisma/prisma.service';

const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
};

const member = (overrides: Record<string, unknown> = {}) => ({
  userId: 'u1',
  status: 'active',
  expiresAt: daysFromNow(3),
  graceEndsAt: null,
  user: { name: 'Diego Ramírez', phone: '+52 55 1234 5678' },
  ...overrides,
});

describe('normalizePhone', () => {
  // Meta espera E.164 sin '+' ni separadores; mandarlo con espacios devuelve
  // un 400 que no dice por qué.
  it('strips punctuation from an international number', () => {
    expect(normalizePhone('+52 55 1234 5678')).toBe('525512345678');
  });

  it('adds the country code to a bare Mexican 10-digit number', () => {
    expect(normalizePhone('55 1234 5678')).toBe('525512345678');
  });
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: { findUnique: jest.Mock; create: jest.Mock };
    membership: { findMany: jest.Mock };
    order: { findUnique: jest.Mock };
  };
  let whatsapp: { configured: boolean; sendTemplate: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notification: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      membership: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findUnique: jest.fn() },
    };
    whatsapp = { configured: true, sendTemplate: jest.fn().mockResolvedValue({ messageId: 'wamid.1' }) };
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WhatsAppService, useValue: whatsapp },
      ],
    }).compile();
    service = module.get(NotificationsService);
  });

  const base = {
    userId: 'u1',
    kind: 'membership_expiring' as const,
    dedupeKey: '2026-10-01',
    phone: '+52 55 1234 5678',
    lang: 'es',
    params: ['Diego', '3'],
  };

  describe('notifyOnce', () => {
    it('sends the approved template and records it', async () => {
      const sent = await service.notifyOnce(base);

      expect(sent).toBe(true);
      expect(whatsapp.sendTemplate).toHaveBeenCalledWith(
        '+52 55 1234 5678',
        'membresia_por_vencer',
        'es',
        ['Diego', '3'],
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'sent', providerMessageId: 'wamid.1' }),
        }),
      );
    });

    // Sin esto, el barrido diario le mandaría el mismo aviso al socio cada vez
    // que corre.
    it('does not send the same notice twice', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1' });

      expect(await service.notifyOnce(base)).toBe(false);
      expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
    });

    // Un aviso que falla no puede tumbar el cobro o la entrega que lo disparó.
    it('swallows a delivery failure and records it instead of throwing', async () => {
      whatsapp.sendTemplate.mockRejectedValue(new Error('número inválido'));

      expect(await service.notifyOnce(base)).toBe(false);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed', error: 'número inválido' }),
        }),
      );
    });

    // El fallo se guarda para que el cron no reintente en bucle contra un
    // número que quizá nunca va a funcionar.
    it('a recorded failure is not retried on the next sweep', async () => {
      whatsapp.sendTemplate.mockRejectedValue(new Error('boom'));
      await service.notifyOnce(base);

      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', status: 'failed' });
      whatsapp.sendTemplate.mockClear();

      expect(await service.notifyOnce(base)).toBe(false);
      expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
    });

    it('skips a member with no phone number', async () => {
      expect(await service.notifyOnce({ ...base, phone: '' })).toBe(false);
      expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
    });

    // El resto del backend tiene que funcionar sin credenciales de Meta.
    it('does nothing when WhatsApp is not configured', async () => {
      whatsapp.configured = false;

      expect(await service.notifyOnce(base)).toBe(false);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('runMembershipSweep', () => {
    it('warns at 7, 3 and 1 days out, and stays quiet otherwise', async () => {
      for (const days of [7, 3, 1]) {
        prisma.membership.findMany.mockResolvedValue([member({ expiresAt: daysFromNow(days) })]);
        whatsapp.sendTemplate.mockClear();
        await service.runMembershipSweep();
        expect(whatsapp.sendTemplate).toHaveBeenCalledTimes(1);
      }

      for (const days of [10, 5, 2]) {
        prisma.membership.findMany.mockResolvedValue([member({ expiresAt: daysFromNow(days) })]);
        whatsapp.sendTemplate.mockClear();
        await service.runMembershipSweep();
        expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
      }
    });

    // Con suscripción, Stripe cobra solo al vencer: "renueva o pierdes el
    // acceso" sería falso y podría hacerlo pagar dos veces.
    it('does not warn a member whose subscription renews itself', async () => {
      prisma.membership.findMany.mockResolvedValue([
        member({ expiresAt: daysFromNow(3), stripeSubscriptionId: 'sub_1' }),
      ]);

      await service.runMembershipSweep();

      expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
    });

    // Canceló la renovación en el portal: esta vez sí vence, hay que avisarle.
    it('warns a member who canceled the renewal', async () => {
      prisma.membership.findMany.mockResolvedValue([
        member({ expiresAt: daysFromNow(3), stripeSubscriptionId: 'sub_1', renewalCanceled: true }),
      ]);

      await service.runMembershipSweep();

      expect(whatsapp.sendTemplate).toHaveBeenCalled();
    });

    // La llave es la FECHA de vencimiento, no "quedan N días": así los tres
    // avisos comparten llave y el socio recibe uno solo por ciclo. Si renueva,
    // la fecha cambia y el siguiente ciclo vuelve a avisar.
    it('keys the warning by the expiry date, so one cycle sends one notice', async () => {
      const expiresAt = daysFromNow(3);
      prisma.membership.findMany.mockResolvedValue([member({ expiresAt })]);

      await service.runMembershipSweep();

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ dedupeKey: expiresAt.toISOString().slice(0, 10) }),
        }),
      );
    });

    // El pago falló y el acceso se suspende cuando termine la gracia — ese
    // aviso gana sobre el de "por vencer".
    it('sends the grace warning instead of the expiry one for a failed payment', async () => {
      prisma.membership.findMany.mockResolvedValue([
        member({ status: 'grace', graceEndsAt: daysFromNow(2), expiresAt: daysFromNow(3) }),
      ]);

      await service.runMembershipSweep();

      expect(whatsapp.sendTemplate).toHaveBeenCalledWith(
        expect.any(String),
        'membresia_pago_fallido',
        'es',
        expect.any(Array),
      );
    });

    it('ignores memberships that already expired', async () => {
      await service.runMembershipSweep();

      expect(prisma.membership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: { in: ['active', 'grace'] } } }),
      );
    });
  });

  describe('notifyPaymentConfirmed', () => {
    const order = {
      id: 'order-1',
      userId: 'u1',
      total: 2580,
      delivery: 'pickup',
      user: { name: 'Diego Ramírez', phone: '+52 55 1234 5678' },
    };

    it('confirms the payment and tells the member the order is ready to collect', async () => {
      prisma.order.findUnique.mockResolvedValue(order);

      await service.notifyPaymentConfirmed('order-1');

      const templates = whatsapp.sendTemplate.mock.calls.map((c) => c[1] as string);
      expect(templates).toEqual(['pago_confirmado', 'pedido_listo']);
    });

    // Un pedido a domicilio no se recoge en ningún lado.
    it('does not send a pickup notice for a home delivery', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...order, delivery: 'home' });

      await service.notifyPaymentConfirmed('order-1');

      const templates = whatsapp.sendTemplate.mock.calls.map((c) => c[1] as string);
      expect(templates).toEqual(['pago_confirmado']);
    });

    it('does nothing for an order that does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await service.notifyPaymentConfirmed('nope');

      expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
    });
  });

  // Spec 008: bodega marcó el pedido a domicilio "en camino".
  describe('notifyOrderShipped', () => {
    const order = {
      id: 'order-1234-abcd',
      userId: 'u1',
      trackingNumber: 'DHL-998877',
      user: { name: 'Diego Ramírez', phone: '+52 55 1234 5678' },
    };

    it('tells the member the order is on its way, with the tracking number, once per order', async () => {
      prisma.order.findUnique.mockResolvedValue(order);

      await service.notifyOrderShipped('order-1234-abcd');

      expect(whatsapp.sendTemplate).toHaveBeenCalledWith(
        expect.any(String),
        'pedido_en_camino',
        'es',
        ['Diego Ramírez', 'ORDER-12', 'DHL-998877'],
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ kind: 'order_shipped', dedupeKey: 'order-1234-abcd' }) }),
      );
    });

    // Las plantillas de Meta tienen un número fijo de parámetros.
    it('says there is no tracking number yet when warehouse did not enter one', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...order, trackingNumber: null });

      await service.notifyOrderShipped('order-1234-abcd');

      expect(whatsapp.sendTemplate.mock.calls[0][3]).toEqual(['Diego Ramírez', 'ORDER-12', 'sin guía por ahora']);
    });

    it('does nothing for an order that does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await service.notifyOrderShipped('nope');
      expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
    });
  });
});
