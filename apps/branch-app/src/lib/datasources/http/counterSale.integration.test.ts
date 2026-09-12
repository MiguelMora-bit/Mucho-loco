import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { CounterSaleHttpDatasource } from './counterSale.http';
import { PickupOrderHttpDatasource } from './pickupOrder.http';
import { CashRegisterShiftHttpDatasource } from './cashRegisterShift.http';
import { AttendanceHttpDatasource } from './attendance.http';
import { ReportsHttpDatasource } from './reports.http';
import { MembershipHttpDatasource } from './membership.http';
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

describe('every other branch endpoint is there and guarded too', () => {
  const pickup = new PickupOrderHttpDatasource();
  const shifts = new CashRegisterShiftHttpDatasource();
  const attendance = new AttendanceHttpDatasource();
  const reports = new ReportsHttpDatasource();
  const memberships = new MembershipHttpDatasource();

  // Una tabla y no un test por método: lo que se afirma es idéntico —la ruta
  // existe (no 404) y el guard la protege (401)— y listarlas juntas hace
  // obvio si falta alguna.
  const calls: Array<[string, () => Promise<unknown>]> = [
    ['pickupOrder.getByBranch', () => pickup.getByBranch(1)],
    ['pickupOrder.markDelivered', () => pickup.markDelivered('order-1')],
    ['cashRegister.getOpenShift', () => shifts.getOpenShift(1)],
    ['cashRegister.getTransactions', () => shifts.getTransactions('shift-1')],
    ['cashRegister.getHistory', () => shifts.getHistory(1)],
    ['cashRegister.closeShift', () => shifts.closeShift('shift-1')],
    ['attendance.getOpenEntry', () => attendance.getOpenEntry('luis@mucholoco.mx')],
    ['attendance.clockIn', () => attendance.clockIn(1, 'luis@mucholoco.mx', 'Luis')],
    ['attendance.clockOut', () => attendance.clockOut('luis@mucholoco.mx')],
    ['attendance.getTeamToday', () => attendance.getTeamToday(1)],
    ['reports.getSalesReport', () => reports.getSalesReport(1, 7)],
    ['membership.findMember', () => memberships.findMember('ML-DIEGO-2026-ALLGYMS')],
    ['membership.renewMembership', () =>
      memberships.renewMembership(1, 'Roma Sur', 'ML-DIEGO-2026-ALLGYMS', 'all', 'monthly', 'card')],
    ['membership.signUpNewMember', () =>
      memberships.signUpNewMember(1, 'Roma Sur', {
        memberName: 'X', phone: '55', tierKey: 'all', periodKey: 'monthly', paymentMethod: 'cash',
      })],
  ];

  it.each(calls)('%s hits a real route and is rejected with 401', async (_name, call) => {
    const status = await statusOf(call);
    expect(status).toBe(401);
    expect(status).not.toBe(404);
  });
});
