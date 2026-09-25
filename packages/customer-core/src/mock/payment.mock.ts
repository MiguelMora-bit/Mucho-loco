import type { Lang, MembershipPlanChoice, NewOrderLine, OrderDelivery } from '@mucho-loco/types';
import type { CheckoutSession, IPaymentRepository, RedirectSession } from '../contract';
import { UserMockDatasource } from './user.mock';
import { delay } from './delay';

/**
 * No hay pasarela en modo mock, y no tiene sentido inventar una pantalla falsa
 * de Stripe: el flujo mock-first tiene que seguir completo sin credenciales
 * de nadie (ver "Metodología" en el CLAUDE.md raíz).
 *
 * Así que aquí el "cobro" es instantáneo y siempre exitoso: se crea el pedido
 * ya pagado (o se activa la membresía) y se devuelve la URL de éxito, que es
 * exactamente a donde Stripe habría devuelto al socio. Lo que NO se puede
 * ejercitar con mocks es lo interesante de una pasarela — pago rechazado, pago
 * diferido, webhook reentregado, renovación que falla; eso vive del lado del
 * backend y se prueba ahí.
 *
 * Las reglas de negocio sí se imitan (no se puede contratar encima de una
 * suscripción viva, etc.): si el mock las ignorara, el swap a HTTP cambiaría
 * lo que la pantalla deja hacer.
 */
export class PaymentMockDatasource implements IPaymentRepository {
  async createCheckoutSession(
    email: string,
    lines: NewOrderLine[],
    delivery: OrderDelivery,
    lang: Lang,
    successUrl: string,
  ): Promise<CheckoutSession> {
    await delay(300);
    const order = new UserMockDatasource().placePaidOrder(email, lines, delivery, lang);
    return { orderId: order.id, url: successUrl };
  }

  async createMembershipCheckout(
    email: string,
    plan: MembershipPlanChoice,
    _lang: Lang,
    successUrl: string,
  ): Promise<RedirectSession> {
    await delay(300);
    new UserMockDatasource().activateMembership(email, plan);
    return { url: successUrl };
  }

  /** Sin Stripe: "hacer algo en el portal" = alternar la renovación, y regresar. */
  async openBillingPortal(email: string, returnUrl: string, _lang: Lang): Promise<RedirectSession> {
    await delay(300);
    new UserMockDatasource().toggleRenewal(email);
    return { url: returnUrl };
  }

  async openMembershipInvoice(email: string, returnUrl: string): Promise<RedirectSession> {
    await delay(300);
    new UserMockDatasource().settleMembershipInvoice(email);
    return { url: returnUrl };
  }
}
