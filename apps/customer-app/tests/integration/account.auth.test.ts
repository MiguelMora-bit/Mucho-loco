import { describe, it, expect, beforeAll } from 'vitest';
import {
  CommunityHttpDatasource,
  PaymentHttpDatasource,
  PerformanceHttpDatasource,
  UserHttpDatasource,
} from '@mucho-loco/customer-core/http';
import { ApiRequestError, createCustomerApi } from '../../lib/datasources/http/client';
import { requireBackend } from './api-available';

/**
 * Los dominios de cuenta (`/users/me`, `/community`, `/performance`) exigen un
 * ID token emitido por Cognito, y hoy NO hay User Pool vivo (infra destruida a
 * propósito, ver CLAUDE.md raíz). Así que lo que se puede verificar contra el
 * backend real es la mitad que no depende de AWS: que cada ruta existe, que
 * el guard la protege de verdad, y que el datasource pega en la URL correcta.
 *
 * La otra mitad — la respuesta con un usuario autenticado — está cubierta por
 * `test/app.e2e-spec.ts` de `apps/backend`, que sobreescribe
 * `CognitoVerifierService` y sí ejerce el flujo completo contra Postgres.
 */
// El mismo cliente que usa el app para cuenta, con un token que no es de Cognito.
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

describe('account endpoints are really guarded', () => {
  it('rejects every /users/me route with 401 when the token is not a valid Cognito ID token', async () => {
    const ds = new UserHttpDatasource(bogusApi);

    expect(await statusOf(() => ds.getProfile('diego@mucholoco.mx'))).toBe(401);
    expect(await statusOf(() => ds.getMembership('diego@mucholoco.mx'))).toBe(401);
    expect(await statusOf(() => ds.getVisitHistory('diego@mucholoco.mx'))).toBe(401);
    expect(await statusOf(() => ds.getOrders('diego@mucholoco.mx'))).toBe(401);
    const payments = new PaymentHttpDatasource(bogusApi);
    expect(
      await statusOf(() =>
        payments.createMembershipCheckout(
          'diego@mucholoco.mx',
          { branchId: 1, tierKey: 'all', periodKey: 'monthly' },
          'es',
          'http://x',
          'http://y',
        ),
      ),
    ).toBe(401);
    expect(await statusOf(() => payments.openMembershipInvoice('diego@mucholoco.mx', 'http://x'))).toBe(401);
    expect(
      await statusOf(() =>
        ds.createOrder('diego@mucholoco.mx', [{ productId: 'p1', qty: 1 }], 'card', 'pickup', 'es'),
      ),
    ).toBe(401);
  });

  it('rejects every /community route with 401', async () => {
    const ds = new CommunityHttpDatasource(bogusApi);

    expect(await statusOf(() => ds.getFeed('diego@mucholoco.mx'))).toBe(401);
    expect(await statusOf(() => ds.createPost('diego@mucholoco.mx', 'hola'))).toBe(401);
    expect(await statusOf(() => ds.toggleLike('diego@mucholoco.mx', 'post-1'))).toBe(401);
    expect(await statusOf(() => ds.addComment('diego@mucholoco.mx', 'post-1', 'hey'))).toBe(401);
  });

  it('rejects every /performance route with 401', async () => {
    const ds = new PerformanceHttpDatasource(bogusApi);

    expect(await statusOf(() => ds.getStats())).toBe(401);
    expect(await statusOf(() => ds.getPersonalRecords())).toBe(401);
    expect(await statusOf(() => ds.getWorkouts())).toBe(401);
    expect(await statusOf(() => ds.getHeatmap())).toBe(401);
  });

  // Un 404 significaría que el datasource pega en una ruta que no existe — el
  // error más fácil de cometer al traducir el contrato mock a URLs, y el que
  // ningún test con `fetch` stubeado puede detectar.
  it('never gets a 404, which would mean the route itself is wrong', async () => {
    const ds = new UserHttpDatasource(bogusApi);

    expect(await statusOf(() => ds.getProfile('x@y.mx'))).not.toBe(404);
  });
});
