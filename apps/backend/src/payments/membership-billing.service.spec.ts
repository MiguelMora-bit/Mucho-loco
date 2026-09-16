/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- jest.fn() sin generics: los mocks de Prisma y Stripe son deliberadamente `any`. */
import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type Stripe from 'stripe';
import {
  MembershipBillingService,
  MEMBERSHIP_KIND,
} from './membership-billing.service';
import { StripeService } from './stripe.provider';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';
import { ChargesService } from '../charges/charges.service';

const DAY = 86_400_000;
const daysFromNow = (days: number): Date => new Date(Date.now() + days * DAY);

const dto = (overrides: Record<string, unknown> = {}) => ({
  branchId: 1,
  tierKey: 'single' as const,
  periodKey: 'monthly' as const,
  lang: 'es' as const,
  successUrl: 'https://mucholoco.mx/dashboard?membership=paid',
  cancelUrl: 'https://mucholoco.mx/membership',
  ...overrides,
});

const planMetadata = {
  kind: MEMBERSHIP_KIND,
  userId: 'user-1',
  branchId: '1',
  tierKey: 'single',
  periodKey: 'monthly',
};

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_1',
    status: 'active',
    metadata: planMetadata,
    items: { data: [{ current_period_end: 1_800_000_000 }] },
    ...overrides,
  };
}

const event = (type: string, object: Record<string, unknown>): Stripe.Event =>
  ({ type, data: { object } }) as unknown as Stripe.Event;

describe('MembershipBillingService', () => {
  let service: MembershipBillingService;
  let prisma: any;
  let stripe: any;
  let charges: { recordMembership: jest.Mock };
  let memberships: {
    findByUser: jest.Mock;
    grant: jest.Mock;
    enterGrace: jest.Mock;
    detachSubscription: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      branch: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 1, name: 'Roma Sur', price: 1090 }),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'diego@mucholoco.mx',
          stripeCustomerId: null,
        }),
        updateMany: jest.fn(),
      },
      membershipPurchase: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      charge: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };
    // La transacción interactiva corre el callback con el mismo mock como `tx`.
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );

    stripe = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'cs_1',
            url: 'https://checkout.stripe.com/x',
          }),
        },
      },
      products: {
        retrieve: jest.fn().mockResolvedValue({}),
        create: jest.fn(),
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue(subscription()),
        update: jest.fn(),
        cancel: jest.fn(),
      },
      paymentIntents: { retrieve: jest.fn() },
      invoicePayments: { list: jest.fn().mockResolvedValue({ data: [] }) },
    };
    memberships = {
      findByUser: jest.fn().mockResolvedValue(null),
      grant: jest.fn(),
      enterGrace: jest.fn(),
      detachSubscription: jest.fn(),
    };

    charges = { recordMembership: jest.fn().mockResolvedValue(true) };

    const module = await Test.createTestingModule({
      providers: [
        MembershipBillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: { stripe } },
        { provide: MembershipsService, useValue: memberships },
        { provide: ChargesService, useValue: charges },
      ],
    }).compile();
    service = module.get(MembershipBillingService);
  });

  const sessionParams = () => stripe.checkout.sessions.create.mock.calls[0][0];

  describe('createCheckout', () => {
    it('opens a subscription priced by the server from the branch, never by the client', async () => {
      await service.createCheckout('user-1', dto());

      const params = sessionParams();
      expect(params.mode).toBe('subscription');
      // Roma Sur $1090 × tier single 1.0 × mensual 1.0, en centavos.
      expect(params.line_items[0].price_data).toMatchObject({
        currency: 'mxn',
        unit_amount: 109000,
        product: 'ml_membership_single',
        recurring: { interval: 'month', interval_count: 1 },
      });
      expect(params).not.toHaveProperty('payment_method_types');
      expect(prisma.membershipPurchase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 1090,
          providerSessionId: 'cs_1',
          periodKey: 'monthly',
        }),
      });
    });

    // Los eventos de renovación de meses después solo traen la suscripción:
    // si la metadata viviera solo en la sesión, no se sabría de quién es.
    it('puts who-and-what on the subscription itself, not only on the session', async () => {
      await service.createCheckout('user-1', dto());

      expect(sessionParams().subscription_data.metadata).toMatchObject(
        planMetadata,
      );
    });

    it('bills quarterly as every 3 months', async () => {
      await service.createCheckout('user-1', dto({ periodKey: 'quarterly' }));

      expect(sessionParams().line_items[0].price_data.recurring).toEqual({
        interval: 'month',
        interval_count: 3,
      });
    });

    it('charges a day pass once, with no subscription', async () => {
      await service.createCheckout(
        'user-1',
        dto({ periodKey: 'visit', tierKey: 'all' }),
      );

      const params = sessionParams();
      expect(params.mode).toBe('payment');
      expect(params.line_items[0].price_data).not.toHaveProperty('recurring');
      expect(params).not.toHaveProperty('subscription_data');
      // `all` es precio fijo desde 2026-09-15 (TIER_BASE_PRICES), no depende
      // de la sucursal del dto: 1550 × 0.12 = 186 → redondeado a la decena.
      expect(params.line_items[0].price_data.unit_amount).toBe(19000);
    });

    it('reuses the member Stripe customer instead of creating a new one each time', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'x@y.mx',
        stripeCustomerId: 'cus_1',
      });

      await service.createCheckout('user-1', dto());

      expect(sessionParams().customer).toBe('cus_1');
      expect(sessionParams()).not.toHaveProperty('customer_email');
    });

    it('refuses a second live subscription — it would charge twice', async () => {
      memberships.findByUser.mockResolvedValue({
        status: 'active',
        expiresAt: daysFromNow(20),
        graceEndsAt: null,
        stripeSubscriptionId: 'sub_old',
      });

      await expect(
        service.createCheckout('user-1', dto()),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('lets a member in grace sign up again (the new subscription replaces the failing one)', async () => {
      memberships.findByUser.mockResolvedValue({
        status: 'grace',
        expiresAt: daysFromNow(-2),
        graceEndsAt: daysFromNow(5),
        stripeSubscriptionId: 'sub_old',
      });

      await service.createCheckout('user-1', dto());

      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('refuses a day pass on top of a membership that is still valid', async () => {
      memberships.findByUser.mockResolvedValue({
        status: 'active',
        expiresAt: daysFromNow(10),
        graceEndsAt: null,
        stripeSubscriptionId: null,
      });

      await expect(
        service.createCheckout('user-1', dto({ periodKey: 'visit' })),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    // Renovar antes de tiempo no le quita al socio lo que ya pagó en mostrador.
    it('starts the first charge when the time already paid runs out', async () => {
      const expiresAt = daysFromNow(20);
      memberships.findByUser.mockResolvedValue({
        status: 'active',
        expiresAt,
        graceEndsAt: null,
        stripeSubscriptionId: null,
      });

      await service.createCheckout('user-1', dto());

      expect(sessionParams().subscription_data.trial_end).toBe(
        Math.floor(expiresAt.getTime() / 1000),
      );
    });

    it('does not carry over a couple of days — Stripe needs the trial 48 h out', async () => {
      memberships.findByUser.mockResolvedValue({
        status: 'active',
        expiresAt: daysFromNow(1),
        graceEndsAt: null,
        stripeSubscriptionId: null,
      });

      await service.createCheckout('user-1', dto());

      expect(sessionParams().subscription_data).not.toHaveProperty('trial_end');
    });

    it('creates the tier product in Stripe the first time only', async () => {
      stripe.products.retrieve.mockRejectedValueOnce({
        code: 'resource_missing',
      });

      await service.createCheckout('user-1', dto());
      await service.createCheckout('user-1', dto());

      expect(stripe.products.create).toHaveBeenCalledTimes(1);
      expect(stripe.products.create).toHaveBeenCalledWith({
        id: 'ml_membership_single',
        name: expect.stringContaining('1 sucursal'),
      });
      expect(stripe.products.retrieve).toHaveBeenCalledTimes(1);
    });

    it('404s an unknown branch', async () => {
      prisma.branch.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckout('user-1', dto({ branchId: 99 })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('syncSubscription — Stripe decides the state', () => {
    it('active: grants the membership through the end of the paid period', async () => {
      await service.syncSubscription('sub_1');

      expect(memberships.grant).toHaveBeenCalledWith({
        userId: 'user-1',
        branchId: 1,
        tierKey: 'single',
        periodKey: 'monthly',
        paidThrough: new Date(1_800_000_000 * 1000),
        stripeSubscriptionId: 'sub_1',
      });
    });

    it('past_due: grace period, not suspension', async () => {
      stripe.subscriptions.retrieve.mockResolvedValue(
        subscription({ status: 'past_due' }),
      );

      await service.syncSubscription('sub_1');

      expect(memberships.enterGrace).toHaveBeenCalledWith('sub_1');
      expect(memberships.grant).not.toHaveBeenCalled();
    });

    it('canceled: stops renewing, keeps what was already paid', async () => {
      stripe.subscriptions.retrieve.mockResolvedValue(
        subscription({ status: 'canceled' }),
      );

      await service.syncSubscription('sub_1');

      expect(memberships.detachSubscription).toHaveBeenCalledWith('sub_1');
    });

    it('ignores a subscription that is not a membership', async () => {
      stripe.subscriptions.retrieve.mockResolvedValue(
        subscription({ metadata: {} }),
      );

      await service.syncSubscription('sub_1');

      expect(memberships.grant).not.toHaveBeenCalled();
    });

    it('cancels the subscription the member replaced before linking the new one', async () => {
      memberships.findByUser.mockResolvedValue({
        stripeSubscriptionId: 'sub_old',
      });
      stripe.subscriptions.retrieve.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'sub_old'
            ? subscription({ id: 'sub_old', status: 'past_due' })
            : subscription(),
        ),
      );

      await service.syncSubscription('sub_1');

      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_old');
      expect(
        stripe.subscriptions.cancel.mock.invocationCallOrder[0],
      ).toBeLessThan(memberships.grant.mock.invocationCallOrder[0]);
    });
  });

  describe('handleEvent', () => {
    it('leaves store checkouts to the store', async () => {
      const handled = await service.handleEvent(
        event('checkout.session.completed', { id: 'cs_store', metadata: {} }),
      );

      expect(handled).toBe(false);
    });

    // En la API dahlia la factura liga su suscripción en parent.subscription_details.
    it('re-reads the subscription when a renewal fails', async () => {
      stripe.subscriptions.retrieve.mockResolvedValue(
        subscription({ status: 'past_due' }),
      );

      const handled = await service.handleEvent(
        event('invoice.payment_failed', {
          parent: { subscription_details: { subscription: 'sub_1' } },
        }),
      );

      expect(handled).toBe(true);
      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_1');
      expect(memberships.enterGrace).toHaveBeenCalledWith('sub_1');
    });

    it('completes a subscription checkout: remembers the customer, keeps the card for renewals, syncs', async () => {
      prisma.membershipPurchase.findUnique.mockResolvedValue({
        id: 'pur_1',
        userId: 'user-1',
        status: 'pending',
      });

      await service.handleEvent(
        event('checkout.session.completed', {
          id: 'cs_1',
          mode: 'subscription',
          payment_status: 'paid',
          customer: 'cus_1',
          subscription: 'sub_1',
          metadata: { kind: MEMBERSHIP_KIND },
        }),
      );

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1', stripeCustomerId: null },
        data: { stripeCustomerId: 'cus_1' },
      });
      expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
        payment_settings: { save_default_payment_method: 'on_subscription' },
      });
      expect(memberships.grant).toHaveBeenCalledWith(
        expect.objectContaining({ stripeSubscriptionId: 'sub_1' }),
      );
    });

    const visitCompleted = event('checkout.session.completed', {
      id: 'cs_visit',
      mode: 'payment',
      payment_status: 'paid',
      customer: null,
      metadata: { kind: MEMBERSHIP_KIND },
    });

    it('a day pass grants 24 hours of access', async () => {
      prisma.membershipPurchase.findUnique.mockResolvedValue({
        id: 'pur_2',
        userId: 'user-1',
        branchId: 1,
        tierKey: 'all',
        periodKey: 'visit',
        amount: 200,
        status: 'pending',
      });

      await service.handleEvent(visitCompleted);

      const [grant] = memberships.grant.mock.calls[0];
      expect(grant).toMatchObject({
        periodKey: 'visit',
        stripeSubscriptionId: null,
      });
      expect(grant.paidThrough.getTime()).toBeGreaterThan(
        daysFromNow(0.9).getTime(),
      );
      // El cobro, en la misma transacción que el acceso que compró.
      expect(charges.recordMembership).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          source: 'membership_visit',
          userId: 'user-1',
          branchId: 1,
          totalCents: 20000,
          origin: { membershipPurchaseId: 'pur_2' },
        }),
      );
    });

    // Stripe reentrega eventos: la segunda vez la compra ya está marcada.
    it('a redelivered day pass does not add a second day', async () => {
      prisma.membershipPurchase.findUnique.mockResolvedValue({
        id: 'pur_2',
        userId: 'user-1',
        status: 'paid',
      });
      prisma.membershipPurchase.updateMany.mockResolvedValue({ count: 0 });

      await service.handleEvent(visitCompleted);

      expect(memberships.grant).not.toHaveBeenCalled();
      expect(charges.recordMembership).not.toHaveBeenCalled();
    });

    const renewalPaid = (overrides: Record<string, unknown> = {}) =>
      event('invoice.paid', {
        id: 'in_1',
        amount_paid: 109000,
        status_transitions: { paid_at: 1_790_000_000 },
        parent: {
          subscription_details: {
            subscription: 'sub_1',
            metadata: planMetadata,
          },
        },
        ...overrides,
      });

    // La membresía solo guarda hasta cuándo está pagada: sin esto, del mes 2
    // en adelante ningún cobro de la suscripción quedaba registrado.
    it('records every paid invoice of the subscription as a charge', async () => {
      stripe.invoicePayments.list.mockResolvedValue({
        data: [
          { payment: { type: 'payment_intent', payment_intent: 'pi_renewal' } },
        ],
      });
      stripe.paymentIntents.retrieve.mockResolvedValue({
        latest_charge: {
          payment_method_details: { type: 'card', card: { funding: 'credit' } },
        },
      });

      await service.handleEvent(renewalPaid());

      expect(memberships.grant).toHaveBeenCalled();
      expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith(
        'pi_renewal',
        {
          expand: ['latest_charge'],
        },
      );
      expect(charges.recordMembership).toHaveBeenCalledWith(prisma, {
        source: 'membership_subscription',
        method: 'card_credit',
        paidAt: new Date(1_790_000_000 * 1000),
        userId: 'user-1',
        branchId: 1,
        tierKey: 'single',
        periodKey: 'monthly',
        totalCents: 109000,
        origin: { stripeInvoiceId: 'in_1' },
      });
    });

    it('does not record a $0 invoice — a renewal started early charged nothing', async () => {
      await service.handleEvent(renewalPaid({ amount_paid: 0 }));

      expect(charges.recordMembership).not.toHaveBeenCalled();
    });

    it('a redelivered invoice is not recorded twice, nor sent back to Stripe', async () => {
      prisma.charge.findUnique.mockResolvedValue({ id: 'charge-1' });

      await service.handleEvent(renewalPaid());

      expect(stripe.invoicePayments.list).not.toHaveBeenCalled();
      expect(charges.recordMembership).not.toHaveBeenCalled();
    });

    it('falls back to the subscription metadata on an invoice that carries none', async () => {
      await service.handleEvent(
        renewalPaid({
          parent: {
            subscription_details: { subscription: 'sub_1', metadata: null },
          },
        }),
      );

      expect(charges.recordMembership).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          userId: 'user-1',
          origin: { stripeInvoiceId: 'in_1' },
        }),
      );
    });

    it('waits for the money on a completed-but-unpaid session', async () => {
      await service.handleEvent(
        event('checkout.session.completed', {
          id: 'cs_oxxo',
          payment_status: 'unpaid',
          metadata: { kind: MEMBERSHIP_KIND },
        }),
      );

      expect(prisma.membershipPurchase.findUnique).not.toHaveBeenCalled();
      expect(memberships.grant).not.toHaveBeenCalled();
    });
  });

  describe('openPendingInvoice', () => {
    beforeEach(() => {
      memberships.findByUser.mockResolvedValue({
        stripeSubscriptionId: 'sub_1',
      });
    });

    it('returns the hosted page of the invoice that failed', async () => {
      stripe.subscriptions.retrieve.mockResolvedValue(
        subscription({
          latest_invoice: {
            status: 'open',
            hosted_invoice_url: 'https://invoice.stripe.com/i/x',
          },
        }),
      );

      expect(await service.openPendingInvoice('user-1')).toEqual({
        url: 'https://invoice.stripe.com/i/x',
      });
    });

    it('409s when there is nothing left to pay', async () => {
      stripe.subscriptions.retrieve.mockResolvedValue(
        subscription({ latest_invoice: { status: 'paid' } }),
      );

      await expect(service.openPendingInvoice('user-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
