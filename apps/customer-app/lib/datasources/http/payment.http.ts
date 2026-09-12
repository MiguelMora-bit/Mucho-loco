import type { Lang, NewOrderLine } from '@mucho-loco/types';
import type { CheckoutSession, IPaymentRepository } from '../../repositories/payment.repository';
import { apiPost } from './client';
import { cookieSessionToken, requireToken, type TokenProvider } from './session-token';

/** `POST /payments/checkout-sessions` del backend — crea el pedido pendiente y la sesión de Stripe. */
export class PaymentHttpDatasource implements IPaymentRepository {
  constructor(private readonly getToken: TokenProvider = cookieSessionToken) {}

  async createCheckoutSession(
    _email: string,
    lines: NewOrderLine[],
    delivery: 'pickup' | 'home',
    lang: Lang,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSession> {
    const path = '/payments/checkout-sessions';
    return apiPost<CheckoutSession>(
      path,
      { items: lines, delivery, lang, successUrl, cancelUrl },
      { token: await requireToken(this.getToken, path) },
    );
  }
}
