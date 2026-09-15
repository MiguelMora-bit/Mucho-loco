/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- getHttpServer() y los jest.Mock sin generics son `any`, como en el resto de los e2e. */
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type Stripe from 'stripe';
import type { MembershipInfo, UserProfile } from '@mucho-loco/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import { StripeService } from '../src/payments/stripe.provider';
import { MembershipsService } from '../src/memberships/memberships.service';
import { calculateMembershipPrice } from '../src/memberships/membership-plans';
import type { IdTokenClaims } from '../src/auth/cognito';

/**
 * El ciclo de vida completo de una membresía pagada en línea, contra Postgres
 * real y con Stripe sobreescrito (misma costura que payments.e2e-spec.ts):
 *
 *   sin membresía → contrata → activa → falla la renovación → gracia →
 *   paga la factura → activa → cancela → vence → compra una visita
 *
 * Los tests van en orden y comparten estado a propósito: cada paso es la
 * consecuencia del anterior, como le pasa a un socio de verdad.
 *
 * `currentSub` es "lo que Stripe dice ahora" de la suscripción. El backend no
 * aplica el evento tal cual: vuelve a leer la suscripción (ver
 * MembershipBillingService), así que cada paso cambia `currentSub` y manda un
 * evento que solo dice "algo cambió".
 */
const MEMBER = 'membresia-e2e@mucholoco.mx';
const SUB = 'sub_e2e_membresia';
const DAY_S = 86_400;

function body<T>(res: Response): T {
  return res.body as T;
}

describe('Membership billing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionsCreate: jest.Mock;
  let constructEvent: jest.Mock;
  let userId: string;
  let currentSub: Record<string, unknown>;

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
            name: 'MEMBRESIA',
            groups: [],
          }),
      })
      .overrideProvider(StripeService)
      .useValue({
        configured: true,
        stripe: {
          checkout: { sessions: { create: sessionsCreate } },
          paymentIntents: {
            retrieve: jest.fn().mockResolvedValue({
              latest_charge: {
                payment_method_details: {
                  type: 'card',
                  card: { funding: 'credit' },
                },
              },
            }),
          },
          invoicePayments: {
            list: jest.fn().mockResolvedValue({
              data: [
                {
                  payment: {
                    type: 'payment_intent',
                    payment_intent: 'pi_e2e_renewal',
                  },
                },
              ],
            }),
          },
          products: {
            retrieve: jest.fn().mockResolvedValue({}),
            create: jest.fn(),
          },
          subscriptions: {
            retrieve: jest.fn(() => Promise.resolve(currentSub)),
            update: jest.fn().mockResolvedValue({}),
            cancel: jest.fn().mockResolvedValue({}),
          },
        },
        constructEvent: (raw: Buffer, sig: string) =>
          constructEvent(raw, sig) as Stripe.Event,
      })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const where = { user: { email: MEMBER } };
    // Primero los cobros: una compra que originó un ingreso no se deja borrar.
    await prisma.charge.deleteMany({ where });
    await prisma.membershipPurchase.deleteMany({ where });
    await prisma.membership.deleteMany({ where });
    await prisma.user.deleteMany({ where: { email: MEMBER } });
    await app.close();
  });

  const server = () => app.getHttpServer();
  const auth = (): [string, string] => ['Authorization', `Bearer ${MEMBER}`];
  const getMembership = async (): Promise<MembershipInfo> =>
    body<MembershipInfo>(
      await request(server())
        .get('/users/me/membership')
        .set(...auth())
        .expect(200),
    );

  /** Stripe avisa; el cuerpo da igual porque el verificador (falso) devuelve el evento. */
  async function deliver(
    type: string,
    object: Record<string, unknown>,
  ): Promise<void> {
    constructEvent.mockReturnValue({ type, data: { object } });
    await request(server())
      .post('/payments/stripe/webhook')
      .set('stripe-signature', 'firma-valida')
      .send({})
      .expect(200);
  }

  function activeSub(
    periodEnd: number,
    status = 'active',
  ): Record<string, unknown> {
    return {
      id: SUB,
      status,
      metadata: {
        kind: 'membership',
        userId,
        branchId: '1',
        tierKey: 'single',
        periodKey: 'monthly',
      },
      items: { data: [{ current_period_end: periodEnd }] },
    };
  }

  const checkout = (overrides: Record<string, unknown> = {}) =>
    request(server())
      .post('/payments/membership-checkout-sessions')
      .set(...auth())
      .send({
        branchId: 1,
        tierKey: 'single',
        periodKey: 'monthly',
        lang: 'es',
        successUrl: 'http://localhost:3000/es/dashboard?membership=paid',
        cancelUrl: 'http://localhost:3000/es/membership',
        ...overrides,
      });

  it('a new member has no membership and no branch until paying', async () => {
    const profile = body<UserProfile>(
      await request(server())
        .get('/users/me')
        .set(...auth())
        .expect(200),
    );
    expect(profile.branch).toBe('');
    await request(server())
      .get('/users/me/membership')
      .set(...auth())
      .expect(404);

    userId = (await prisma.user.findUniqueOrThrow({ where: { email: MEMBER } }))
      .id;
  });

  let sessionId: string;
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * DAY_S;

  it('opens a subscription checkout priced by the server from the branch', async () => {
    sessionId = `cs_e2e_sub_${Date.now()}`;
    sessionsCreate.mockResolvedValue({
      id: sessionId,
      url: 'https://checkout.stripe.com/c/pay/m',
    });

    const res = await checkout().expect(201);
    expect(body<{ url: string }>(res).url).toContain('checkout.stripe.com');

    const branch = await prisma.branch.findUniqueOrThrow({ where: { id: 1 } });
    const price = calculateMembershipPrice(branch.price, 'single', 'monthly');
    const params = sessionsCreate.mock
      .calls[0][0] as Stripe.Checkout.SessionCreateParams;
    expect(params.mode).toBe('subscription');
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(price * 100);

    const purchase = await prisma.membershipPurchase.findUniqueOrThrow({
      where: { providerSessionId: sessionId },
    });
    expect(purchase).toMatchObject({
      status: 'pending',
      amount: price,
      userId,
    });
    // Pagar no es volver de Stripe: hasta el webhook, sigue sin membresía.
    await request(server())
      .get('/users/me/membership')
      .set(...auth())
      .expect(404);
  });

  it('rejects a client-supplied amount', async () => {
    await checkout({ amount: 1 }).expect(400);
  });

  it('activates the membership when Stripe confirms the payment', async () => {
    currentSub = activeSub(periodEnd);
    await deliver('checkout.session.completed', {
      id: sessionId,
      mode: 'subscription',
      payment_status: 'paid',
      customer: 'cus_e2e_membresia',
      subscription: SUB,
      metadata: { kind: 'membership' },
    });

    const membership = await getMembership();
    expect(membership).toMatchObject({
      status: 'active',
      tierKey: 'single',
      autoRenews: true,
      branch: 'ROMA SUR',
    });
    expect(membership.expiresAt).toBe(new Date(periodEnd * 1000).toISOString());

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.stripeCustomerId).toBe('cus_e2e_membresia');
    const purchase = await prisma.membershipPurchase.findUniqueOrThrow({
      where: { providerSessionId: sessionId },
    });
    expect(purchase).toMatchObject({
      status: 'paid',
      providerSubscriptionId: SUB,
    });
  });

  it('refuses a second subscription while this one is alive — it would charge twice', async () => {
    const res = await checkout().expect(409);
    expect(body<{ code: string }>(res).code).toBe('ALREADY_SUBSCRIBED');
  });

  it('a failed renewal puts the member in grace, with access and a deadline', async () => {
    currentSub = activeSub(periodEnd, 'past_due');
    await deliver('invoice.payment_failed', {
      parent: { subscription_details: { subscription: SUB } },
    });

    const membership = await getMembership();
    expect(membership.status).toBe('grace');
    expect(Date.parse(membership.graceEndsAt ?? '')).toBeGreaterThan(
      Date.now() + 6 * DAY_S * 1000,
    );
  });

  it('in grace, hands the member the Stripe page of the invoice that failed', async () => {
    currentSub = {
      ...activeSub(periodEnd, 'past_due'),
      latest_invoice: {
        status: 'open',
        hosted_invoice_url: 'https://invoice.stripe.com/i/e2e',
      },
    };

    const res = await request(server())
      .post('/payments/membership-invoice')
      .set(...auth())
      .expect(201);
    expect(body<{ url: string }>(res).url).toBe(
      'https://invoice.stripe.com/i/e2e',
    );
  });

  it('paying that invoice brings the membership back to active and extends it', async () => {
    const nextPeriodEnd = periodEnd + 30 * DAY_S;
    currentSub = activeSub(nextPeriodEnd);
    await deliver('invoice.paid', {
      id: 'in_e2e_renewal',
      amount_paid: 109000,
      parent: { subscription_details: { subscription: SUB } },
    });

    const membership = await getMembership();
    expect(membership).toMatchObject({ status: 'active', graceEndsAt: null });
    expect(membership.expiresAt).toBe(
      new Date(nextPeriodEnd * 1000).toISOString(),
    );

    // Cada cobro de la suscripción queda registrado. Antes, del mes 2 en
    // adelante no quedaba rastro del dinero en ninguna tabla.
    const charge = await prisma.charge.findUniqueOrThrow({
      where: { stripeInvoiceId: 'in_e2e_renewal' },
      include: { lines: true },
    });
    expect(charge).toMatchObject({
      source: 'membership_subscription',
      method: 'card_credit',
      totalCents: 109000,
      userId,
      branchId: 1,
    });
    expect(charge.lines).toEqual([
      expect.objectContaining({
        unitPriceCents: 109000,
        taxCategoryId: 'gym_membership',
      }),
    ]);
  });

  it('a redelivered paid invoice is recorded only once', async () => {
    await deliver('invoice.paid', {
      id: 'in_e2e_renewal',
      amount_paid: 109000,
      parent: { subscription_details: { subscription: SUB } },
    });

    expect(
      await prisma.charge.count({
        where: { stripeInvoiceId: 'in_e2e_renewal' },
      }),
    ).toBe(1);
  });

  it('a redelivered stale event cannot undo it: the backend re-reads Stripe', async () => {
    // Llega OTRA VEZ el aviso de fallo, pero Stripe ya dice active.
    await deliver('invoice.payment_failed', {
      parent: { subscription_details: { subscription: SUB } },
    });

    expect((await getMembership()).status).toBe('active');
  });

  it('a canceled subscription keeps the paid time, then lapses on its own', async () => {
    currentSub = { ...activeSub(periodEnd), status: 'canceled' };
    await deliver('customer.subscription.deleted', { id: SUB });

    const stillPaid = await getMembership();
    expect(stillPaid).toMatchObject({ status: 'active', autoRenews: false });

    // Pasa el tiempo: se acabó lo pagado.
    await prisma.membership.update({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    // El socio (y la sucursal) lo ven vencido al momento...
    expect((await getMembership()).status).toBe('expired');
    // ...y el cron lo deja escrito para reportes y avisos.
    await app.get(MembershipsService).expireLapsed();
    const row = await prisma.membership.findUniqueOrThrow({
      where: { userId },
    });
    expect(row.status).toBe('expired');
  });

  it('a day pass after expiry grants 24 hours, and only once per payment', async () => {
    const visitSession = `cs_e2e_visit_${Date.now()}`;
    sessionsCreate.mockResolvedValue({
      id: visitSession,
      url: 'https://checkout.stripe.com/c/pay/v',
    });
    await checkout({ periodKey: 'visit', tierKey: 'all' }).expect(201);
    expect(
      (sessionsCreate.mock.lastCall as [Stripe.Checkout.SessionCreateParams])[0]
        .mode,
    ).toBe('payment');

    const completed = {
      id: visitSession,
      mode: 'payment',
      payment_status: 'paid',
      customer: 'cus_e2e_membresia',
      payment_intent: 'pi_e2e_visit',
      metadata: { kind: 'membership' },
    };
    await deliver('checkout.session.completed', completed);

    const first = await getMembership();
    expect(first).toMatchObject({
      status: 'active',
      tierKey: 'all',
      autoRenews: false,
    });
    const hoursLeft = (Date.parse(first.expiresAt) - Date.now()) / 3_600_000;
    expect(hoursLeft).toBeGreaterThan(23);
    expect(hoursLeft).toBeLessThanOrEqual(24);

    // Stripe reentrega el mismo evento: no suma otro día.
    await deliver('checkout.session.completed', completed);
    expect((await getMembership()).expiresAt).toBe(first.expiresAt);

    // Y tampoco registra el cobro dos veces.
    const purchase = await prisma.membershipPurchase.findUniqueOrThrow({
      where: { providerSessionId: visitSession },
    });
    const charges = await prisma.charge.findMany({
      where: { membershipPurchaseId: purchase.id },
    });
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({
      source: 'membership_visit',
      method: 'card_credit',
      totalCents: purchase.amount * 100,
    });
  });

  it('refuses a day pass while the membership is still valid', async () => {
    const res = await checkout({ periodKey: 'visit' }).expect(409);
    expect(body<{ code: string }>(res).code).toBe('MEMBERSHIP_STILL_ACTIVE');
  });
});
