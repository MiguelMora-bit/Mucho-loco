import { describe, it, expect, beforeAll } from 'vitest';
import { InvoicingHttpDatasource } from '@mucho-loco/customer-core/http';
import { ApiRequestError, createCustomerApi } from '../../lib/datasources/http/client';
import { requireBackend } from './api-available';

/**
 * Facturar contra el backend real, con la misma limitación que
 * account.auth.test.ts: sin User Pool vivo solo se puede probar que cada ruta
 * del datasource EXISTE (un error de dedo en la URL daría 404, no 401) y que
 * el guard la protege.
 *
 * La comparación campo por campo mock ↔ HTTP de las respuestas autenticadas
 * no se puede hacer aquí. La cubren: `http.test.ts` de customer-core (rutas y
 * formas del datasource), `invoicing.e2e-spec.ts` del backend (respuesta real
 * contra Postgres, incluido `invoice.uuid`) y el test de llaves del mock.
 */
const bogusApi = createCustomerApi({ getToken: async () => 'no-es-un-jwt-de-cognito' });

async function statusOf(call: () => Promise<unknown>): Promise<number> {
  try {
    await call();
    throw new Error('se esperaba un rechazo del guard, pero la llamada pasó');
  } catch (e) {
    if (e instanceof ApiRequestError) return e.status;
    throw e;
  }
}

beforeAll(requireBackend);

describe('invoicing endpoints exist and are guarded', () => {
  it('rejects every invoicing route with 401 (not 404) without a valid Cognito ID token', async () => {
    const ds = new InvoicingHttpDatasource(bogusApi);
    const profile = {
      taxId: 'CUPU800825569',
      legalName: 'JUAN PÉREZ',
      taxSystem: '612',
      zip: '06700',
      cfdiUse: 'G03' as const,
      email: null,
    };

    expect(await statusOf(() => ds.getFiscalProfile('x'))).toBe(401);
    expect(await statusOf(() => ds.saveFiscalProfile('x', profile))).toBe(401);
    expect(await statusOf(() => ds.getCharges('x'))).toBe(401);
    expect(await statusOf(() => ds.invoiceCharge('x', 'charge-1'))).toBe(401);
    expect(await statusOf(() => ds.downloadInvoice('x', 'cfdi-1', 'pdf'))).toBe(401);
  });
});
