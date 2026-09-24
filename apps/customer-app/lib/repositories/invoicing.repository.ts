import type { IInvoicingRepository, InvoiceFile } from '@mucho-loco/customer-core/contract';
import { InvoicingHttpDatasource } from '@mucho-loco/customer-core/http';
import { InvoicingMockDatasource } from '@mucho-loco/customer-core/mock';
import { accountApi } from '../datasources/http/account-client';
import { isHttpDatasourceEnabled } from '../datasources/http/config';

// El contrato y los datasources viven en @mucho-loco/customer-core (los va a
// compartir mobile-app); aquí solo se elige cuál y con qué cliente. Cuenta =
// `accountApi`: solo servidor, lee la cookie ml_session.
export type { IInvoicingRepository, InvoiceFile };

export const invoicingRepository: IInvoicingRepository = isHttpDatasourceEnabled()
  ? new InvoicingHttpDatasource(accountApi)
  : new InvoicingMockDatasource();
