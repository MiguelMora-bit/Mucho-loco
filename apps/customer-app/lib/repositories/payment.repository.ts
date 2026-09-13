import type { CheckoutSession, IPaymentRepository } from '@mucho-loco/customer-core/contract';
import { PaymentHttpDatasource } from '@mucho-loco/customer-core/http';
import { PaymentMockDatasource } from '@mucho-loco/customer-core/mock';
import { accountApi } from '../datasources/http/account-client';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

// El contrato y los datasources viven en @mucho-loco/customer-core (los
// comparte mobile-app); aquí solo se elige cuál y con qué cliente. Cuenta =
// `accountApi`: solo servidor, lee la cookie ml_session.
export type { CheckoutSession, IPaymentRepository };

export const paymentRepository: IPaymentRepository = isHttpDatasourceEnabled()
  ? new PaymentHttpDatasource(accountApi)
  : new PaymentMockDatasource();
