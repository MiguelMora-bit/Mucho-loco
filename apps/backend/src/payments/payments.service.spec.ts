/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest.fn() sin generics: los mocks de Prisma y Stripe son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.provider';
import { PrismaService } from '../prisma/prisma.service';

const whey = {
  id: 'p1',
  name: { es: 'Whey Protein 5LBS', en: 'Whey Protein 5LBS' },
  flav: { es: 'Fresa', en: 'Strawberry' },
  price: 1290,
  img: '/assets/whey.jpg',
};

const baseDto = {
  items: [{ productId: 'p1', qty: 2 }],
  delivery: 'pickup' as const,
  lang: 'es' as const,
  successUrl: 'https://mucholoco.mx/checkout/gracias',
  cancelUrl: 'https://mucholoco.mx/checkout',
};

function sessionEvent(
  type: string,
  overrides: Record<string, unknown> = {},
): Stripe.Event {
  return {
    type,
    data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_1', ...overrides } },
  } as unknown as Stripe.Event;
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    product: { findMany: jest.Mock };
    membership: { findUnique: jest.Mock };
    order: { create: jest.Mock; update: jest.Mock };
    payment: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let sessionsCreate: jest.Mock;

  beforeEach(async () => {
    sessionsCreate = jest.fn().mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/x' });
    prisma = {
      product: { findMany: jest.fn().mockResolvedValue([whey]) },
      membership: { findUnique: jest.fn().mockResolvedValue({ branchId: 1 }) },
      order: { create: jest.fn().mockResolvedValue({ id: 'order-1' }), update: jest.fn() },
      payment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: StripeService,
          useValue: { stripe: { checkout: { sessions: { create: sessionsCreate } } } },
        },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  describe('createCheckoutSession', () => {
    it('prices the session from the catalog, in cents', async () => {
      await service.createCheckoutSession('u1', baseDto);

      const params = sessionsCreate.mock.calls[0][0] as Stripe.Checkout.SessionCreateParams;
      // $1290 x 2 → 129000 centavos por unidad, cantidad 2. Sin la conversión
      // se cobrarían $12.90.
      expect(params.line_items?.[0]).toMatchObject({
        quantity: 2,
        price_data: expect.objectContaining({ currency: 'mxn', unit_amount: 129000 }),
      });
    });

    it('adds the shipping fee as its own line for a home delivery', async () => {
      await service.createCheckoutSession('u1', { ...baseDto, delivery: 'home' });

      const params = sessionsCreate.mock.calls[0][0] as Stripe.Checkout.SessionCreateParams;
      expect(params.line_items).toHaveLength(2);
      expect(params.line_items?.[1].price_data?.unit_amount).toBe(9900);
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ total: 1290 * 2 + 99 }) }),
      );
    });

    // Fijar payment_method_types apagaría los métodos de pago dinámicos, con
    // los que Stripe elige qué ofrecer según país, monto y dispositivo.
    it('never pins payment_method_types', async () => {
      await service.createCheckoutSession('u1', baseDto);

      const params = sessionsCreate.mock.calls[0][0] as Record<string, unknown>;
      expect(params.payment_method_types).toBeUndefined();
    });

    // Si el pedido se creara al volver de Stripe, alguien que paga y cierra la
    // pestaña habría pagado sin que exista pedido.
    it('saves the order as pending payment before sending the member to pay', async () => {
      await service.createCheckoutSession('u1', baseDto);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'pending_payment', paymentMethod: 'stripe' }),
        }),
      );
      const orderCallOrder = prisma.order.create.mock.invocationCallOrder[0];
      expect(orderCallOrder).toBeLessThan(sessionsCreate.mock.invocationCallOrder[0]);
    });

    // Sin esto, el webhook no sabría a qué pedido corresponde el cobro, y el
    // socio podría no volver nunca al sitio.
    it('carries the order id on the session so the webhook can reconcile it', async () => {
      await service.createCheckoutSession('u1', baseDto);

      const params = sessionsCreate.mock.calls[0][0] as Stripe.Checkout.SessionCreateParams;
      expect(params.client_reference_id).toBe('order-1');
      expect(params.metadata).toEqual({ orderId: 'order-1' });
    });

    it('appends the session id to the success url so the page can look it up', async () => {
      await service.createCheckoutSession('u1', baseDto);

      const params = sessionsCreate.mock.calls[0][0] as Stripe.Checkout.SessionCreateParams;
      expect(params.success_url).toBe(
        'https://mucholoco.mx/checkout/gracias?session_id={CHECKOUT_SESSION_ID}',
      );
    });

    it('records the pending payment against the session', async () => {
      await service.createCheckoutSession('u1', baseDto);

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          provider: 'stripe',
          status: 'pending',
          amount: 2580,
          providerSessionId: 'cs_test_1',
        }),
      });
    });

    it('rejects a product outside the catalog before touching Stripe', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await expect(service.createCheckoutSession('u1', baseDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(sessionsCreate).not.toHaveBeenCalled();
    });

    it('rejects a pickup order from a member with no membership', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.createCheckoutSession('u1', baseDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('handleEvent', () => {
    const pendingPayment = { id: 'pay-1', orderId: 'order-1', status: 'pending' };

    it('marks the order ready once the session is paid', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);

      await service.handleEvent(sessionEvent('checkout.session.completed'));

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'ready' },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'paid', providerPaymentIntentId: 'pi_1' },
      });
    });

    // Con métodos de notificación diferida (OXXO, transferencia) el evento
    // 'completed' llega ANTES de que el dinero exista. Surtir ahí regalaría
    // pedidos que después fallan.
    it('does not fulfil a completed session that is still unpaid', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);

      await service.handleEvent(
        sessionEvent('checkout.session.completed', { payment_status: 'unpaid' }),
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('fulfils on the async success event, which is when that money lands', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);

      await service.handleEvent(sessionEvent('checkout.session.async_payment_succeeded'));

      expect(prisma.order.update).toHaveBeenCalled();
    });

    // Stripe reentrega el mismo evento ante cualquier duda. Sin esta guarda, un
    // reintento volvería a escribir sobre un pedido ya surtido.
    it('is idempotent: a redelivered event changes nothing', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, status: 'paid' });

      await service.handleEvent(sessionEvent('checkout.session.completed'));

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('ignores a webhook for a session it never created', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleEvent(sessionEvent('checkout.session.completed')),
      ).resolves.toBeUndefined();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // El pedido se queda en pending_payment, no se borra: el socio puede
    // reintentar sin volver a armar el carrito.
    it('marks the payment failed on an async failure, leaving the order alone', async () => {
      prisma.payment.findUnique.mockResolvedValue(pendingPayment);

      await service.handleEvent(sessionEvent('checkout.session.async_payment_failed'));

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'failed' },
      });
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('never un-pays an already paid order when a late failure arrives', async () => {
      prisma.payment.findUnique.mockResolvedValue({ ...pendingPayment, status: 'paid' });

      await service.handleEvent(sessionEvent('checkout.session.async_payment_failed'));

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    // Responder error a un evento que no nos interesa haría que Stripe lo
    // reintentara para siempre.
    it('ignores unrelated event types without failing', async () => {
      await expect(
        service.handleEvent(sessionEvent('payment_intent.created')),
      ).resolves.toBeUndefined();
    });
  });
});
