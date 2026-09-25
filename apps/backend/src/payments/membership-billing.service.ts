import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Lang, MembershipPlanChoice, PlanKey, TierKey } from '@mucho-loco/types';
import type { Membership } from '@prisma/client';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.provider';
import { MembershipsService } from '../memberships/memberships.service';
import {
  PERIOD_DAYS,
  PERIOD_NAME,
  addDays,
  calculateMembershipPrice,
} from '../memberships/membership-plans';
import { effectiveStatus } from '../memberships/membership-status';
import { ChargesService } from '../charges/charges.service';
import {
  eventTime,
  invoiceMethod,
  paymentIntentMethod,
} from './stripe-payment-method';
import {
  alreadySubscribed,
  branchNotFound,
  membershipStillActive,
  noBillingAccount,
  nothingToPay,
} from '../common/error-codes';
import type { CreateMembershipCheckoutDto } from './dto/create-membership-checkout.dto';

const toCents = (pesos: number): number => pesos * 100;

/** Distinta a la de la tienda: así se comparan los dos flujos en el dashboard de Stripe. */
const INTEGRATION_IDENTIFIER = 'mucho-loco-membership-hwzqkvtr';

/**
 * Marca que llevan la sesión y la suscripción en su metadata. El webhook es
 * uno solo para tienda y membresías; con esto se sabe a quién le toca cada
 * evento sin buscar en dos tablas.
 */
export const MEMBERSHIP_KIND = 'membership';

/** La visita es pago único; el resto se cobra solo cada periodo. */
const RECURRING: Record<
  Exclude<PlanKey, 'visit'>,
  { interval: 'week' | 'month' | 'year'; interval_count: number }
> = {
  weekly: { interval: 'week', interval_count: 1 },
  monthly: { interval: 'month', interval_count: 1 },
  quarterly: { interval: 'month', interval_count: 3 },
  annual: { interval: 'year', interval_count: 1 },
};

/**
 * Un Product de Stripe por tier, con id fijo — la guía de Stripe pide un
 * Product por plan que el cliente puede elegir (el nombre es lo que se ve en
 * Checkout y en la factura). El precio va aparte en cada sesión (`price_data`)
 * porque depende de la sucursal: 15 sucursales × 4 periodos serían 120 Prices
 * que mantener sincronizados con la tabla de sucursales.
 */
const PRODUCT: Record<TierKey, { id: string; name: string }> = {
  single: {
    id: 'ml_membership_single',
    name: 'Membresía Mucho Loco · 1 sucursal',
  },
  all: {
    id: 'ml_membership_all',
    name: 'Membresía Mucho Loco · 15 sucursales',
  },
};

/**
 * Si al socio le queda al menos esto de lo que ya pagó (en mostrador, por
 * ejemplo), la suscripción nueva arranca cuando eso se acaba en vez de hoy.
 * Stripe pide que `trial_end` quede a más de 48 h; 3 días deja margen para
 * el tiempo que tarde en pagar dentro de Checkout.
 */
const MIN_CARRY_OVER_MS = 3 * 86_400_000;

const TIERS: readonly string[] = ['single', 'all'];
const PERIODS: readonly string[] = [
  'visit',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
];

type PlanOwner = MembershipPlanChoice & { userId: string };

/** Lo que viaja en la metadata. Validado, no casteado: viene de fuera. */
function planFromMetadata(
  meta: Stripe.Metadata | null | undefined,
): PlanOwner | null {
  if (!meta || meta.kind !== MEMBERSHIP_KIND) return null;
  const branchId = Number(meta.branchId);
  if (!meta.userId || !Number.isInteger(branchId)) return null;
  if (!TIERS.includes(meta.tierKey) || !PERIODS.includes(meta.periodKey))
    return null;
  return {
    userId: meta.userId,
    branchId,
    tierKey: meta.tierKey as TierKey,
    periodKey: meta.periodKey as PlanKey,
  };
}

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

function hasCode(err: unknown, ...codes: string[]): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    codes.includes((err as { code?: string }).code ?? '')
  );
}

/**
 * Cobro de membresías en línea con Stripe Billing.
 *
 * La regla que ordena todo: **el estado de una membresía con suscripción lo
 * decide Stripe**. Cada evento de suscripción o factura NO se aplica tal cual
 * llega: se vuelve a leer la suscripción de Stripe y se copia su estado
 * (`syncSubscription`). Stripe no garantiza el orden de los eventos — la
 * factura pagada puede llegar antes que la sesión completada, y un
 * `subscription.updated` viejo después de uno nuevo — y leer el estado fresco
 * hace que el orden no importe y que reprocesar un evento no cambie nada.
 *
 * | Stripe dice          | La membresía queda                                   |
 * |----------------------|------------------------------------------------------|
 * | active / trialing    | active, pagada hasta el fin del periodo              |
 * | past_due             | grace por GRACE_DAYS (acceso con aviso)              |
 * | canceled / unpaid    | sin suscripción: vale hasta expiresAt y vence sola   |
 */
@Injectable()
export class MembershipBillingService {
  private readonly logger = new Logger(MembershipBillingService.name);
  private readonly readyProducts = new Set<TierKey>();

  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private memberships: MembershipsService,
    private charges: ChargesService,
  ) {}

  /**
   * Abre la sesión de Checkout para contratar. Visita = pago único; el resto
   * = suscripción que Stripe cobra sola cada periodo.
   */
  async createCheckout(
    userId: string,
    dto: CreateMembershipCheckoutDto,
  ): Promise<{ url: string }> {
    const [branch, user, membership] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.memberships.findByUser(userId),
    ]);
    if (!branch) throw new NotFoundException(branchNotFound(dto.branchId));

    const now = new Date();
    const status = membership ? effectiveStatus(membership, now) : null;
    // Una segunda suscripción viva le cobraría dos veces. Cambiar de plan o
    // cancelar es cosa del portal de cliente (`openBillingPortal`), no de volver a pagar.
    if (membership?.stripeSubscriptionId && status === 'active') {
      throw new ConflictException(alreadySubscribed());
    }
    if (dto.periodKey === 'visit' && membership && status !== 'expired') {
      throw new ConflictException(membershipStillActive());
    }

    const amount = calculateMembershipPrice(
      branch.price,
      dto.tierKey,
      dto.periodKey,
    );
    const product = await this.ensureProduct(dto.tierKey);
    const purchaseId = randomUUID();
    const metadata = {
      kind: MEMBERSHIP_KIND,
      purchaseId,
      userId,
      branchId: String(branch.id),
      tierKey: dto.tierKey,
      periodKey: dto.periodKey,
    };
    const description = `${branch.name} · ${PERIOD_NAME[dto.periodKey]}`;
    const recurring =
      dto.periodKey === 'visit' ? null : RECURRING[dto.periodKey];

    // Sin `payment_method_types`, igual que en la tienda: los métodos de pago
    // dinámicos deciden qué ofrecerle a cada socio.
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: recurring ? 'subscription' : 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'mxn',
            unit_amount: toCents(amount),
            product,
            ...(recurring ? { recurring } : {}),
          },
        },
      ],
      locale: dto.lang,
      success_url: `${dto.successUrl}${dto.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: dto.cancelUrl,
      client_reference_id: purchaseId,
      metadata,
      integration_identifier: INTEGRATION_IDENTIFIER,
      // El mismo cliente de Stripe en cada compra: así la tarjeta guardada y
      // el historial de facturas son de UN socio, no de uno nuevo cada vez.
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : user.email
          ? { customer_email: user.email }
          : {}),
    };

    if (recurring) {
      const carryOver = carryOverUntil(membership, now);
      params.subscription_data = {
        // En la SUSCRIPCIÓN, no solo en la sesión: los eventos de renovación
        // (meses después) solo traen la suscripción, y de ahí sale de quién es.
        metadata,
        description,
        // Lo que el socio ya pagó no se pierde por renovar antes de tiempo: el
        // primer cobro cae el día que se le acaba.
        ...(carryOver
          ? { trial_end: Math.floor(carryOver.getTime() / 1000) }
          : {}),
      };
    } else {
      params.payment_intent_data = { description, metadata };
      if (!user.stripeCustomerId) params.customer_creation = 'always';
    }

    const session = await this.stripe.stripe.checkout.sessions.create(params);
    if (!session.url)
      throw new BadRequestException('Stripe no devolvió una URL de checkout');

    await this.prisma.membershipPurchase.create({
      data: {
        id: purchaseId,
        userId,
        branchId: branch.id,
        tierKey: dto.tierKey,
        periodKey: dto.periodKey,
        amount,
        provider: 'stripe',
        providerSessionId: session.id,
      },
    });

    return { url: session.url };
  }

  /**
   * En periodo de gracia: la factura que no se pudo cobrar, en la página
   * hospedada de Stripe, para pagarla ya con otra tarjeta. Al pagarla llega
   * `invoice.paid` y la membresía vuelve a `active` — no se toca nada aquí.
   */
  async openPendingInvoice(userId: string): Promise<{ url: string }> {
    const membership = await this.memberships.findByUser(userId);
    if (!membership?.stripeSubscriptionId)
      throw new ConflictException(nothingToPay());

    const sub = await this.stripe.stripe.subscriptions.retrieve(
      membership.stripeSubscriptionId,
      {
        expand: ['latest_invoice'],
      },
    );
    const invoice =
      typeof sub.latest_invoice === 'object' ? sub.latest_invoice : null;
    if (invoice?.status !== 'open' || !invoice.hosted_invoice_url) {
      throw new ConflictException(nothingToPay());
    }
    return { url: invoice.hosted_invoice_url };
  }

  /**
   * Portal de cliente de Stripe (spec 005): cancelar o reactivar la
   * renovación, cambiar la tarjeta, ver sus cobros. Solo con una suscripción
   * viva — sin ella no hay nada que administrar. Lo que el socio haga ahí
   * llega por los mismos webhooks de siempre (`customer.subscription.updated`).
   */
  async openBillingPortal(
    userId: string,
    returnUrl: string,
    lang: Lang,
  ): Promise<{ url: string }> {
    const [user, membership] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.memberships.findByUser(userId),
    ]);
    if (!user?.stripeCustomerId || !membership?.stripeSubscriptionId) {
      throw new ConflictException(noBillingAccount());
    }
    const session = await this.stripe.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
      locale: lang === 'en' ? 'en' : 'es',
    });
    return { url: session.url };
  }

  /**
   * Procesa un evento ya verificado. Devuelve `false` si no era de
   * membresías, para que `PaymentsService` lo trate como de la tienda.
   */
  async handleEvent(event: Stripe.Event): Promise<boolean> {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (session.metadata?.kind !== MEMBERSHIP_KIND) return false;
        await this.completeCheckout(session, eventTime(event));
        return true;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object;
        if (session.metadata?.kind !== MEMBERSHIP_KIND) return false;
        await this.prisma.membershipPurchase.updateMany({
          where: { providerSessionId: session.id, status: 'pending' },
          data: { status: 'failed' },
        });
        return true;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = idOf(
          invoice.parent?.subscription_details?.subscription,
        );
        if (!subscriptionId) return false;
        await this.syncSubscription(subscriptionId);
        await this.recordInvoice(invoice, subscriptionId, eventTime(event));
        return true;
      }
      case 'invoice.payment_failed': {
        const subscriptionId = idOf(
          event.data.object.parent?.subscription_details?.subscription,
        );
        if (!subscriptionId) return false;
        await this.syncSubscription(subscriptionId);
        return true;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.syncSubscription(event.data.object.id);
        return true;
      default:
        return false;
    }
  }

  /** Copia a la membresía el estado que Stripe tiene AHORA de la suscripción. */
  async syncSubscription(subscriptionId: string): Promise<void> {
    const sub = await this.stripe.stripe.subscriptions.retrieve(subscriptionId);
    const plan = planFromMetadata(sub.metadata);
    if (!plan) {
      this.logger.warn(
        `Suscripción ${sub.id} sin metadata de membresía — se ignora`,
      );
      return;
    }

    switch (sub.status) {
      case 'active':
      case 'trialing': {
        // Una suscripción nueva reemplaza a la vieja (el socio volvió a
        // contratar desde gracia o suspendido). La vieja se cancela ANTES de
        // ligar la nueva: si cancelarla falla, el error sube, Stripe reintenta
        // el evento, y en el reintento la vieja sigue ligada y se vuelve a
        // intentar — nunca quedan dos cobrándole.
        const current = await this.memberships.findByUser(plan.userId);
        if (
          current?.stripeSubscriptionId &&
          current.stripeSubscriptionId !== sub.id
        ) {
          await this.cancelReplaced(current.stripeSubscriptionId);
        }
        // Con API 2025-03 en adelante el periodo vive en cada item, no en la suscripción.
        const periodEnd = Math.max(
          ...sub.items.data.map((item) => item.current_period_end),
        );
        await this.memberships.grant({
          ...plan,
          paidThrough: new Date(periodEnd * 1000),
          stripeSubscriptionId: sub.id,
          // Cancelada en el portal: sigue viva hasta el fin del periodo, pero ya no se cobra.
          renewalCanceled: Boolean(sub.cancel_at_period_end || sub.cancel_at),
        });
        return;
      }
      case 'past_due':
        await this.memberships.enterGrace(sub.id);
        return;
      case 'canceled':
      case 'unpaid':
      case 'incomplete_expired':
        await this.memberships.detachSubscription(sub.id);
        return;
      default:
        // incomplete (el primer cobro no ha terminado) o paused: nada que dar todavía.
        return;
    }
  }

  private async completeCheckout(
    session: Stripe.Checkout.Session,
    paidAt: Date,
  ): Promise<void> {
    // Con pago diferido (OXXO, transferencia) la sesión se completa sin
    // dinero; llega después como async_payment_succeeded. `no_payment_required`
    // sí pasa: es una renovación adelantada, cuyo primer cobro es más adelante.
    if (session.payment_status === 'unpaid') {
      this.logger.log(
        `Sesión ${session.id} completada pero todavía sin pagar — se espera el evento asíncrono`,
      );
      return;
    }
    const purchase = await this.prisma.membershipPurchase.findUnique({
      where: { providerSessionId: session.id },
    });
    if (!purchase) {
      this.logger.warn(
        `Webhook de una compra de membresía desconocida: ${session.id}`,
      );
      return;
    }

    const customerId = idOf(session.customer);
    if (customerId) await this.rememberCustomer(purchase.userId, customerId);

    if (session.mode === 'subscription') {
      const subscriptionId = idOf(session.subscription);
      if (!subscriptionId) {
        this.logger.warn(`Sesión de suscripción ${session.id} sin suscripción`);
        return;
      }
      if (purchase.status !== 'paid') {
        await this.prisma.membershipPurchase.update({
          where: { id: purchase.id },
          data: { status: 'paid', providerSubscriptionId: subscriptionId },
        });
        await this.saveCardForRenewals(subscriptionId);
      }
      await this.syncSubscription(subscriptionId);
      return;
    }

    // Visita. Marcar la compra, dar el acceso y registrar el cobro van en UNA
    // transacción, con la marca primero: si el evento llega dos veces, el
    // segundo encuentra la compra ya pagada y no suma otro día; y si dar el
    // acceso falla, la marca se revierte y el reintento de Stripe lo vuelve a
    // intentar.
    if (purchase.status === 'paid') return;
    const method = await paymentIntentMethod(
      this.stripe.stripe,
      idOf(session.payment_intent),
    );
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.membershipPurchase.updateMany({
        where: { id: purchase.id, status: { not: 'paid' } },
        data: { status: 'paid' },
      });
      if (claimed.count === 0) return;
      await this.memberships.grant(
        {
          userId: purchase.userId,
          branchId: purchase.branchId,
          tierKey: purchase.tierKey,
          periodKey: purchase.periodKey,
          paidThrough: addDays(new Date(), PERIOD_DAYS[purchase.periodKey]),
          // Una visita no se renueva. Si quedaba ligada una suscripción ya
          // muerta, se suelta: si no, la tolerancia de renovación le daría
          // días de más a una visita de 24 h.
          stripeSubscriptionId: null,
        },
        tx,
      );
      await this.charges.recordMembership(tx, {
        source: 'membership_visit',
        method,
        paidAt,
        userId: purchase.userId,
        branchId: purchase.branchId,
        tierKey: purchase.tierKey,
        periodKey: purchase.periodKey,
        totalCents: session.amount_total ?? toCents(purchase.amount),
        origin: { membershipPurchaseId: purchase.id },
      });
    });
  }

  /**
   * Cada cobro de la suscripción — el primero incluido — es un ingreso, y éste
   * es el único lugar donde queda: la membresía solo guarda hasta cuándo está
   * pagada. Por eso el primer cobro NO se registra en completeCheckout aunque
   * también llegue por ahí: se contaría dos veces.
   *
   * Una factura en $0 (renovación adelantada, con trial_end) no cobró nada.
   */
  private async recordInvoice(
    invoice: Stripe.Invoice,
    subscriptionId: string,
    eventAt: Date,
  ): Promise<void> {
    const invoiceId = invoice.id;
    if (!invoiceId || !(invoice.amount_paid > 0)) return;
    // Reentregado: ya está, y así no se repiten las llamadas a Stripe de abajo.
    const existing = await this.prisma.charge.findUnique({
      where: { stripeInvoiceId: invoiceId },
    });
    if (existing) return;

    // La metadata congelada en la factura es el plan que se cobró; la de la
    // suscripción hoy podría ser otro. Solo falta en facturas viejas.
    const plan =
      planFromMetadata(invoice.parent?.subscription_details?.metadata) ??
      planFromMetadata(
        (await this.stripe.stripe.subscriptions.retrieve(subscriptionId))
          .metadata,
      );
    if (!plan) {
      this.logger.warn(
        `Factura ${invoiceId} sin plan de membresía — no se registra el cobro`,
      );
      return;
    }

    const method = await invoiceMethod(this.stripe.stripe, invoiceId);
    const paidAtSeconds = invoice.status_transitions?.paid_at;
    await this.prisma.$transaction((tx) =>
      this.charges.recordMembership(tx, {
        source: 'membership_subscription',
        method,
        paidAt: paidAtSeconds ? new Date(paidAtSeconds * 1000) : eventAt,
        userId: plan.userId,
        branchId: plan.branchId,
        tierKey: plan.tierKey,
        periodKey: plan.periodKey,
        // Stripe ya cobra en centavos.
        totalCents: invoice.amount_paid,
        origin: { stripeInvoiceId: invoiceId },
      }),
    );
  }

  /**
   * Para que la tarjeta con la que el socio paga una factura atrasada (en la
   * página de Stripe) quede como la de sus renovaciones. Sin esto, paga el
   * atraso con una tarjeta nueva y el mes siguiente Stripe vuelve a intentar
   * con la que ya fallaba. Si no se puede, no se pierde el cobro: solo se avisa.
   */
  private async saveCardForRenewals(subscriptionId: string): Promise<void> {
    try {
      await this.stripe.stripe.subscriptions.update(subscriptionId, {
        payment_settings: { save_default_payment_method: 'on_subscription' },
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo fijar la tarjeta por defecto de ${subscriptionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async rememberCustomer(
    userId: string,
    customerId: string,
  ): Promise<void> {
    try {
      await this.prisma.user.updateMany({
        where: { id: userId, stripeCustomerId: null },
        data: { stripeCustomerId: customerId },
      });
    } catch (err) {
      if (!hasCode(err, 'P2002')) throw err;
      this.logger.warn(
        `El cliente de Stripe ${customerId} ya está ligado a otro socio`,
      );
    }
  }

  private async cancelReplaced(subscriptionId: string): Promise<void> {
    const old = await this.stripe.stripe.subscriptions.retrieve(subscriptionId);
    if (old.status === 'canceled' || old.status === 'incomplete_expired')
      return;
    await this.stripe.stripe.subscriptions.cancel(subscriptionId);
    this.logger.log(
      `Suscripción ${subscriptionId} cancelada: la reemplazó una nueva`,
    );
  }

  /** Crea el Product del tier la primera vez que se necesita (id fijo, así es idempotente). */
  private async ensureProduct(tierKey: TierKey): Promise<string> {
    const { id, name } = PRODUCT[tierKey];
    if (this.readyProducts.has(tierKey)) return id;
    try {
      await this.stripe.stripe.products.retrieve(id);
    } catch (err) {
      if (!hasCode(err, 'resource_missing')) throw err;
      try {
        await this.stripe.stripe.products.create({ id, name });
      } catch (createErr) {
        // Otra instancia lo creó entre el retrieve y el create.
        if (!hasCode(createErr, 'resource_already_exists')) throw createErr;
      }
    }
    this.readyProducts.add(tierKey);
    return id;
  }
}

/** Hasta cuándo sigue pagado lo que el socio ya tenía, si vale la pena respetarlo. */
function carryOverUntil(membership: Membership | null, now: Date): Date | null {
  if (!membership || membership.stripeSubscriptionId) return null;
  if (effectiveStatus(membership, now) !== 'active') return null;
  if (membership.expiresAt.getTime() - now.getTime() < MIN_CARRY_OVER_MS)
    return null;
  return membership.expiresAt;
}
