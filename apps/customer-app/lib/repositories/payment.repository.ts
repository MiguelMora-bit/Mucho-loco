import type { Lang, NewOrderLine } from '@mucho-loco/types';
import { PaymentMockDatasource } from '../datasources/mock/payment.mock';
import { PaymentHttpDatasource } from '../datasources/http/payment.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

export interface CheckoutSession {
  orderId: string;
  /** A dónde mandar al socio para que pague. */
  url: string;
}

export interface IPaymentRepository {
  /**
   * Abre un cobro con pasarela. Igual que `createOrder`, NO recibe importes:
   * el servidor arma el total desde el catálogo y es él quien se lo cobra a
   * la tarjeta.
   */
  createCheckoutSession(
    email: string,
    lines: NewOrderLine[],
    delivery: 'pickup' | 'home',
    lang: Lang,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSession>;
}

export const paymentRepository: IPaymentRepository = isHttpDatasourceEnabled()
  ? new PaymentHttpDatasource()
  : new PaymentMockDatasource();
