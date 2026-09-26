import type { ChargeMethod } from '@prisma/client';
import type Stripe from 'stripe';

/**
 * Cómo pagó el socio, leído del cargo de Stripe — la sesión de Checkout no lo
 * dice: lista los métodos que se OFRECIERON, no el que se usó.
 *
 * - `card` trae `funding`: crédito y débito son formas de pago distintas para
 *   el SAT. Prepago o desconocido se queda en `card`.
 * - `customer_balance` es como llega una transferencia SPEI en México.
 * - Cualquier otro (Link, wallets) paga con tarjeta por debajo.
 */
export function methodOf(
  details: Stripe.Charge.PaymentMethodDetails | null | undefined,
): ChargeMethod {
  switch (details?.type) {
    case 'oxxo':
      return 'oxxo';
    case 'customer_balance':
      return 'spei';
    case 'card':
      if (details.card?.funding === 'credit') return 'card_credit';
      if (details.card?.funding === 'debit') return 'card_debit';
      return 'card';
    default:
      return 'card';
  }
}

/**
 * El método del cobro de un PaymentIntent. Sin PaymentIntent no hubo cargo
 * que leer (no debería pasar con una sesión pagada); se registra como tarjeta,
 * que es lo único que Checkout cobra sin uno.
 */
export async function paymentIntentMethod(
  stripe: Stripe,
  paymentIntentId: string | null,
): Promise<ChargeMethod> {
  if (!paymentIntentId) return 'card';
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });
  const charge =
    typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  return methodOf(charge?.payment_method_details);
}

/**
 * Lo mismo para la factura de una suscripción: con la API `dahlia` la factura
 * ya no trae su PaymentIntent directo, vive en sus InvoicePayments.
 *
 * `null` = pagada sin ningún pago de Stripe (ni PaymentIntent ni cargo): la
 * marcaron pagada fuera de su plataforma — el atraso que cobró mostrador
 * (spec 019). El dinero no pasó por Stripe, así que no hay método que leer.
 */
export async function invoiceMethod(
  stripe: Stripe,
  invoiceId: string,
): Promise<ChargeMethod | null> {
  const payments = await stripe.invoicePayments.list({
    invoice: invoiceId,
    status: 'paid',
  });
  const collected = payments.data.filter(
    (p) => p.payment.payment_intent !== undefined || p.payment.charge !== undefined,
  );
  if (collected.length === 0) return null;
  const intent = collected
    .map((p) => p.payment.payment_intent)
    .find((ref) => ref !== undefined);
  const intentId = typeof intent === 'string' ? intent : (intent?.id ?? null);
  return paymentIntentMethod(stripe, intentId);
}

/**
 * Cuándo lo confirmó Stripe. Para OXXO y SPEI es el día que el socio pagó en
 * la tienda o hizo la transferencia — no el día que abrió el checkout — y eso
 * decide en qué mes se factura.
 */
export function eventTime(event: Stripe.Event): Date {
  return event.created ? new Date(event.created * 1000) : new Date();
}
