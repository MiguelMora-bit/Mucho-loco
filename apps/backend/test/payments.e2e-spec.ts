import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type Stripe from 'stripe';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import { StripeService } from '../src/payments/stripe.provider';
import type { IdTokenClaims } from '../src/auth/cognito';

/**
 * E2E de pagos contra Postgres real, con Stripe sobreescrito.
 *
 * `StripeService` es la costura: los tests le dan una implementación falsa en
 * vez de mockear el módulo `stripe` con `jest.mock()`, así el código de
 * producción no cambia de forma por ser testeado — mismo patrón que
 * `CognitoVerifierService`.
 *
 * Lo que NO cubre: que Stripe de verdad cobre. Eso necesita llaves de sandbox
 * reales y `stripe listen` reenviando webhooks; ver "Pagos" en el CLAUDE.md
 * del backend.
 */
const CUSTOMER = 'pagos-e2e@mucholoco.mx';

function body<T>(res: Response): T {
  return res.body as T;
}

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionsCreate: jest.Mock;
  let constructEvent: jest.Mock;

  beforeAll(async () => {
    sessionsCreate = jest.fn();
    constructEvent = jest.fn();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CognitoVerifierService)
      .useValue({
        verify: (token: string): Promise<IdTokenClaims> =>
          Promise.resolve({
            sub: `sub-${token}`,
            email: token,
            name: token.split('@')[0].toUpperCase(),
            groups: [],
          }),
      })
      .overrideProvider(StripeService)
      .useValue({
        configured: true,
        stripe: { checkout: { sessions: { create: sessionsCreate } } },
        constructEvent: (raw: Buffer, sig: string) => constructEvent(raw, sig) as Stripe.Event,
      })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    // "Recoger en gym" sale de la sucursal de la membresía, y un socio nuevo
    // ya no nace con una: este ya pagó la suya. Mismo `sub` que arma el
    // verificador falso de arriba, así la auto-provisión lo encuentra.
    const user = await prisma.user.upsert({
      where: { email: CUSTOMER },
      create: { email: CUSTOMER, cognitoSub: `sub-${CUSTOMER}`, name: 'PAGOS-E2E' },
      update: {},
    });
    await prisma.membership.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        branchId: 1,
        tierKey: 'all',
        periodKey: 'monthly',
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        accessCode: 'ML-PAGOS-E2E',
      },
      update: {},
    });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({ where: { order: { user: { email: CUSTOMER } } } });
    await prisma.orderItem.deleteMany({ where: { order: { user: { email: CUSTOMER } } } });
    await prisma.order.deleteMany({ where: { user: { email: CUSTOMER } } });
    await prisma.membership.deleteMany({ where: { user: { email: CUSTOMER } } });
    await prisma.user.deleteMany({ where: { email: CUSTOMER } });
    await app.close();
  });

  const auth = (): [string, string] => ['Authorization', `Bearer ${CUSTOMER}`];

  describe('POST /payments/checkout-sessions', () => {
    let orderId: string;
    let sessionId: string;

    it('creates a pending order and returns the Stripe url', async () => {
      sessionId = `cs_test_${Date.now()}`;
      sessionsCreate.mockResolvedValue({ id: sessionId, url: 'https://checkout.stripe.com/c/pay/x' });

      const res = await request(app.getHttpServer())
        .post('/payments/checkout-sessions')
        .set(...auth())
        .send({
          items: [{ productId: 'p1', qty: 2 }],
          delivery: 'pickup',
          lang: 'es',
          successUrl: 'http://localhost:3000/es/checkout/gracias',
          cancelUrl: 'http://localhost:3000/es/checkout',
        })
        .expect(201);
      const out = body<{ orderId: string; url: string }>(res);
      orderId = out.orderId;

      expect(out.url).toContain('checkout.stripe.com');

      const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
      expect(order.status).toBe('pending_payment');
      // Precio del catálogo: $1290 x 2. El cliente no manda importes.
      expect(order.total).toBe(2580);

      const payment = await prisma.payment.findUniqueOrThrow({
        where: { providerSessionId: sessionId },
      });
      expect(payment.status).toBe('pending');
    });

    it('does not appear as ready in the member order list until it is paid', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/orders')
        .set(...auth())
        .expect(200);
      const order = body<{ id: string; status: string }[]>(res).find((o) => o.id === orderId);

      expect(order?.status).toBe('pending_payment');
    });

    it('rejects a client-supplied total', async () => {
      await request(app.getHttpServer())
        .post('/payments/checkout-sessions')
        .set(...auth())
        .send({
          items: [{ productId: 'p1', qty: 1 }],
          delivery: 'pickup',
          lang: 'es',
          successUrl: 'http://x',
          cancelUrl: 'http://y',
          total: 1,
        })
        .expect(400);
    });

    it('requires a session', async () => {
      await request(app.getHttpServer())
        .post('/payments/checkout-sessions')
        .send({
          items: [{ productId: 'p1', qty: 1 }],
          delivery: 'pickup',
          lang: 'es',
          successUrl: 'http://x',
          cancelUrl: 'http://y',
        })
        .expect(401);
    });

    describe('webhook', () => {
      // Lo llama Stripe, no un usuario: el endpoint es público y lo único que
      // lo protege es la firma. Sin esta verificación, cualquiera podría
      // marcar pedidos como pagados.
      it('is reachable without a token but rejects a bad signature', async () => {
        constructEvent.mockImplementation(() => {
          throw new Error('No signatures found matching the expected signature');
        });

        const res = await request(app.getHttpServer())
          .post('/payments/stripe/webhook')
          .set('stripe-signature', 'firma-inventada')
          .send({ type: 'checkout.session.completed' });

        expect(res.status).toBe(400);
      });

      it('rejects a request with no signature header at all', async () => {
        await request(app.getHttpServer())
          .post('/payments/stripe/webhook')
          .send({ type: 'checkout.session.completed' })
          .expect(400);
      });

      it('fulfils the order when a verified paid session arrives', async () => {
        constructEvent.mockReturnValue({
          type: 'checkout.session.completed',
          data: { object: { id: sessionId, payment_status: 'paid', payment_intent: 'pi_e2e_1' } },
        });

        await request(app.getHttpServer())
          .post('/payments/stripe/webhook')
          .set('stripe-signature', 'firma-valida')
          .send({})
          .expect(200);

        const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
        const payment = await prisma.payment.findUniqueOrThrow({
          where: { providerSessionId: sessionId },
        });
        expect(order.status).toBe('ready');
        expect(payment.status).toBe('paid');
        expect(payment.providerPaymentIntentId).toBe('pi_e2e_1');
      });

      // Stripe reentrega el mismo evento ante cualquier duda.
      it('a redelivered event does not double-fulfil', async () => {
        await request(app.getHttpServer())
          .post('/payments/stripe/webhook')
          .set('stripe-signature', 'firma-valida')
          .send({})
          .expect(200);

        const payments = await prisma.payment.findMany({ where: { orderId } });
        expect(payments).toHaveLength(1);
        expect(payments[0].status).toBe('paid');
      });

      it('a late failure never un-pays a paid order', async () => {
        constructEvent.mockReturnValue({
          type: 'checkout.session.async_payment_failed',
          data: { object: { id: sessionId } },
        });

        await request(app.getHttpServer())
          .post('/payments/stripe/webhook')
          .set('stripe-signature', 'firma-valida')
          .send({})
          .expect(200);

        const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
        expect(order.status).toBe('ready');
      });

      // Un pago de notificación diferida (OXXO, transferencia) llega
      // 'completed' pero sin dinero todavía.
      it('does not fulfil a completed-but-unpaid session', async () => {
        const pendingSession = `cs_test_pendiente_${Date.now()}`;
        sessionsCreate.mockResolvedValue({ id: pendingSession, url: 'https://checkout.stripe.com/c/pay/y' });

        const created = await request(app.getHttpServer())
          .post('/payments/checkout-sessions')
          .set(...auth())
          .send({
            items: [{ productId: 'p9', qty: 1 }],
            delivery: 'pickup',
            lang: 'es',
            successUrl: 'http://x',
            cancelUrl: 'http://y',
          })
          .expect(201);
        const pendingOrderId = body<{ orderId: string }>(created).orderId;

        constructEvent.mockReturnValue({
          type: 'checkout.session.completed',
          data: { object: { id: pendingSession, payment_status: 'unpaid' } },
        });

        await request(app.getHttpServer())
          .post('/payments/stripe/webhook')
          .set('stripe-signature', 'firma-valida')
          .send({})
          .expect(200);

        const order = await prisma.order.findUniqueOrThrow({ where: { id: pendingOrderId } });
        expect(order.status).toBe('pending_payment');
      });
    });
  });
});
