/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- getHttpServer() y los jest.Mock sin generics son `any`, como en el resto de los e2e. */
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type Stripe from 'stripe';
import type { MembershipPayment, OverdueBalance } from '@mucho-loco/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import { StripeService } from '../src/payments/stripe.provider';
import type { IdTokenClaims } from '../src/auth/cognito';

/**
 * Spec 019: un socio en gracia (Stripe no pudo cobrar su renovación) paga el
 * atraso en mostrador. La factura se marca pagada fuera de Stripe y la
 * suscripción sigue viva. Stripe sobreescrito, Postgres real.
 */
const QR = 'ML-OVERDUE-E2E';
const SUB = 'sub_e2e_overdue';
const INVOICE = 'in_e2e_overdue';
const DAY_S = 86_400;

function body<T>(res: Response): T {
  return res.body as T;
}

describe('Counter overdue payment (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: string;
  let invoiceStatus: 'open' | 'paid';
  let subStatus: 'past_due' | 'active';
  const periodEnd = Math.floor(Date.now() / 1000) + 30 * DAY_S;
  const pay = jest.fn();
  const constructEvent = jest.fn();

  const subscription = () => ({
    id: SUB,
    status: subStatus,
    metadata: { kind: 'membership', userId, branchId: '1', tierKey: 'all', periodKey: 'monthly' },
    items: { data: [{ current_period_end: periodEnd }] },
    latest_invoice: { id: INVOICE, status: invoiceStatus, amount_due: 155000 },
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CognitoVerifierService)
      .useValue({
        verify: (token: string): Promise<IdTokenClaims> =>
          Promise.resolve({ sub: `sub-${token}`, email: token, name: 'STAFF', groups: ['staff'] }),
      })
      .overrideProvider(StripeService)
      .useValue({
        configured: true,
        stripe: {
          subscriptions: { retrieve: jest.fn(() => Promise.resolve(subscription())) },
          invoices: { pay },
          // Pagada fuera de Stripe: sin PaymentIntent ni cargo.
          invoicePayments: { list: jest.fn().mockResolvedValue({ data: [] }) },
        },
        constructEvent: (raw: Buffer, sig: string) => constructEvent(raw, sig) as Stripe.Event,
      })
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const user = await prisma.user.create({ data: { name: 'Socio Atrasado', phone: '+525500000019' } });
    userId = user.id;
    await prisma.membership.create({
      data: {
        userId,
        branchId: 1,
        tierKey: 'all',
        periodKey: 'monthly',
        expiresAt: new Date(Date.now() - DAY_S * 1000),
        status: 'grace',
        graceEndsAt: new Date(Date.now() + 6 * DAY_S * 1000),
        accessCode: QR,
        stripeSubscriptionId: SUB,
      },
    });
  });

  beforeEach(() => {
    invoiceStatus = 'open';
    subStatus = 'past_due';
    pay.mockReset();
    // Stripe marca la factura pagada y la suscripción vuelve a activa.
    pay.mockImplementation(() => {
      invoiceStatus = 'paid';
      subStatus = 'active';
      return Promise.resolve({ id: INVOICE, status: 'paid' });
    });
  });

  afterAll(async () => {
    try {
      await prisma.charge.deleteMany({ where: { userId } });
      await prisma.membershipPayment.deleteMany({ where: { qrCode: QR } });
      await prisma.membership.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } finally {
      await app.close();
    }
  });

  const server = () => app.getHttpServer();
  const staff: [string, string] = ['Authorization', 'Bearer staff@mucholoco.mx'];
  const settle = (payload: object = { qrCode: QR, paymentMethod: 'cash' }) =>
    request(server()).post('/branches/1/memberships/overdue').set(...staff).send(payload);

  it('reports the open invoice as the overdue amount, in pesos', async () => {
    const res = await request(server()).get(`/branches/1/memberships/overdue?qrCode=${QR}`).set(...staff).expect(200);
    expect(body<OverdueBalance>(res)).toEqual({ amount: 1550, tierKey: 'all', periodKey: 'monthly' });
  });

  it('records nothing when Stripe does not accept the payment', async () => {
    pay.mockRejectedValueOnce(new Error('This invoice can no longer be paid'));
    const res = await settle().expect(502);
    expect(body<{ code: string }>(res).code).toBe('PAYMENT_PROVIDER_ERROR');
    expect(await prisma.membershipPayment.count({ where: { qrCode: QR } })).toBe(0);
    expect(await prisma.charge.count({ where: { userId } })).toBe(0);
  });

  it('marks the invoice paid out of band FIRST, then records the cash and reactivates', async () => {
    const res = await settle().expect(201);

    expect(pay).toHaveBeenCalledWith(INVOICE, { paid_out_of_band: true });
    expect(body<MembershipPayment>(res)).toMatchObject({ amount: 1550, paymentMethod: 'cash', isNewMember: false });
    const membership = await prisma.membership.findUniqueOrThrow({ where: { accessCode: QR } });
    expect(membership).toMatchObject({ status: 'active', graceEndsAt: null, stripeSubscriptionId: SUB });
    expect(membership.expiresAt.getTime()).toBe(periodEnd * 1000);
    const charges = await prisma.charge.findMany({ where: { userId } });
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ branchId: 1, method: 'cash', totalCents: 155000 });
    expect(charges[0].membershipPaymentId).not.toBeNull();
  });

  it('answers 409 to a second charge: the invoice is no longer open', async () => {
    invoiceStatus = 'paid';
    subStatus = 'active';
    const res = await settle().expect(409);
    expect(body<{ code: string }>(res).code).toBe('NOTHING_TO_PAY');
    expect(pay).not.toHaveBeenCalled();
  });

  it('does not record a second charge when Stripe reports that invoice as paid', async () => {
    invoiceStatus = 'paid';
    subStatus = 'active';
    constructEvent.mockReturnValue({
      type: 'invoice.paid',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: INVOICE,
          amount_paid: 155000,
          status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
          parent: { subscription_details: { subscription: SUB, metadata: subscription().metadata } },
        },
      },
    });
    await request(server()).post('/payments/stripe/webhook').set('stripe-signature', 'ok').send({}).expect(200);
    expect(await prisma.charge.count({ where: { userId } })).toBe(1);
  });

  it('answers 409 for a member without an online subscription', async () => {
    await request(server()).get('/branches/1/memberships/overdue?qrCode=ML-QR-NOEXISTE').set(...staff).expect(404);
    const other = await prisma.user.create({ data: { name: 'Sin Suscripción', phone: '+525500000020' } });
    try {
      await prisma.membership.create({
        data: {
          userId: other.id, branchId: 1, tierKey: 'single', periodKey: 'monthly',
          expiresAt: new Date(Date.now() + 10 * DAY_S * 1000), accessCode: 'ML-NOSUB-E2E',
        },
      });
      const res = await request(server()).get('/branches/1/memberships/overdue?qrCode=ML-NOSUB-E2E').set(...staff).expect(409);
      expect(body<{ code: string }>(res).code).toBe('NOTHING_TO_PAY');
    } finally {
      await prisma.membership.deleteMany({ where: { userId: other.id } });
      await prisma.user.deleteMany({ where: { id: other.id } });
    }
  });
});
