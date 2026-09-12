import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { CounterSaleHttpDatasource } from './counterSale.http';
import { ApiRequestError } from './client';
import { apiBaseUrl } from './config';
import { useAuthStore } from '../../stores/auth.store';

/**
 * Integración contra el backend REAL.
 *
 * Qué verifica y qué no: los endpoints de sucursal exigen un ID token de
 * Cognito con grupo `staff`, y **no hay User Pool vivo** (infra destruida a
 * propósito, ver CLAUDE.md raíz). Así que lo que se puede probar aquí es la
 * mitad que no depende de AWS, y que es justo la que ningún test con `fetch`
 * stubeado puede cubrir: **que la ruta existe y que el guard la protege**.
 *
 * Un error de dedo en la URL (`/branches/1/inventary`) pasa todos los tests
 * unitarios — porque afirman contra la misma URL equivocada — y solo se cae
 * en producción. Aquí se cae ahora, como un 404.
 *
 * La otra mitad (la respuesta con un usuario autenticado, campo por campo)
 * está cubierta por `test/branch-ops.e2e-spec.ts` de `apps/backend`, que
 * sobreescribe el verifier y sí ejerce el flujo completo contra Postgres.
 */
const BOGUS_TOKEN = 'no-es-un-jwt-de-cognito';

async function statusOf(call: () => Promise<unknown>): Promise<number> {
  try {
    await call();
    throw new Error('se esperaba un rechazo del guard, pero la llamada pasó');
  } catch (e) {
    if (e instanceof ApiRequestError) return e.status;
    throw e;
  }
}

beforeAll(async () => {
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`respondió ${res.status}`);
  } catch (cause) {
    throw new Error(
      `El backend no responde en ${base} (${cause instanceof Error ? cause.message : cause}).\n` +
        'Levantarlo antes:\n  pnpm --filter @mucho-loco/backend start:dev',
    );
  }
});

beforeEach(() => {
  useAuthStore.getState().setSession({
    user: { email: 'luis@mucholoco.mx', name: 'Luis', role: 'staff', branchId: 1, branchName: 'Roma Sur' },
    idToken: BOGUS_TOKEN,
    refreshToken: 'x',
    idTokenExp: Math.floor(Date.now() / 1000) + 3600,
  });
});

afterEach(() => useAuthStore.getState().clear());

describe('counter sale endpoints are really there and really guarded', () => {
  const ds = new CounterSaleHttpDatasource();

  it('rejects the branch inventory with 401 when the token is not a real Cognito token', async () => {
    expect(await statusOf(() => ds.getInventory(1))).toBe(401);
  });

  it('rejects a counter sale the same way', async () => {
    expect(
      await statusOf(() => ds.createSale(1, [{ productId: 'p7', qty: 1 }], 'cash')),
    ).toBe(401);
  });

  // Un 404 significaría que el datasource pega en una ruta que no existe — el
  // error más fácil de cometer al traducir el contrato mock a URLs.
  it('never gets a 404, which would mean the route itself is wrong', async () => {
    expect(await statusOf(() => ds.getInventory(1))).not.toBe(404);
    expect(
      await statusOf(() => ds.createSale(1, [{ productId: 'p7', qty: 1 }], 'cash')),
    ).not.toBe(404);
  });

  it('fails before hitting the network when there is no staff session', async () => {
    useAuthStore.getState().clear();

    await expect(ds.getInventory(1)).rejects.toThrow(/sin sesión/i);
  });
});
