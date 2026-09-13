import type { Lang, NewOrderLine } from '@mucho-loco/types';
import type { CheckoutSession, IPaymentRepository } from '../contract';
import { UserMockDatasource } from './user.mock';
import { delay } from './delay';

/**
 * No hay pasarela en modo mock, y no tiene sentido inventar una pantalla falsa
 * de Stripe: el flujo mock-first tiene que seguir completo sin credenciales
 * de nadie (ver "Metodología" en el CLAUDE.md raíz).
 *
 * Así que aquí el "cobro" es instantáneo y siempre exitoso: se crea el pedido
 * ya pagado y se devuelve la URL de éxito, que es exactamente a donde Stripe
 * habría devuelto al socio. Lo que NO se puede ejercitar con mocks es lo
 * interesante de una pasarela — pago rechazado, pago diferido, webhook
 * reentregado; eso vive del lado del backend y se prueba ahí.
 */
export class PaymentMockDatasource implements IPaymentRepository {
  async createCheckoutSession(
    email: string,
    lines: NewOrderLine[],
    delivery: 'pickup' | 'home',
    lang: Lang,
    successUrl: string,
  ): Promise<CheckoutSession> {
    await delay(300);
    const order = await new UserMockDatasource().createOrder(email, lines, 'card', delivery, lang);
    return { orderId: order.id, url: successUrl };
  }
}
