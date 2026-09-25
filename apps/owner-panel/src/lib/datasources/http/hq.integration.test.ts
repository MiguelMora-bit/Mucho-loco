import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { StatsHttpDatasource } from './stats.http';
import { InventoryTransferHttpDatasource } from './inventoryTransfer.http';
import { ExpensesHttpDatasource } from './expenses.http';
import { PayrollHttpDatasource } from './payroll.http';
import { InvoicingHttpDatasource } from './invoicing.http';
import { ApiRequestError } from './client';
import { apiBaseUrl } from './config';
import { useAuthStore } from '../../stores/auth.store';

/**
 * Integración contra el backend REAL.
 *
 * Igual que en `branch-app`: las rutas de HQ exigen un ID token de Cognito con
 * grupo `owner` y no hay User Pool vivo (infra destruida a propósito, ver
 * CLAUDE.md raíz). Lo que se verifica aquí es lo que ningún test con `fetch`
 * stubeado puede: **que la ruta existe y que el guard la protege**. Un error
 * de dedo en la URL pasa todos los unitarios, porque afirman contra la misma
 * URL equivocada.
 *
 * La respuesta autenticada campo por campo la cubre `test/branch-ops.e2e-spec.ts`
 * del backend, que sí puede sobreescribir el verifier.
 */
const stats = new StatsHttpDatasource();
const transfers = new InventoryTransferHttpDatasource();
const expenses = new ExpensesHttpDatasource();
const payroll = new PayrollHttpDatasource();

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
    user: { email: 'rodrigo@mucholoco.mx', name: 'Rodrigo' },
    idToken: 'no-es-un-jwt-de-cognito',
    refreshToken: 'x',
    idTokenExp: Math.floor(Date.now() / 1000) + 3600,
  });
});

afterEach(() => useAuthStore.getState().clear());

const invoicing = new InvoicingHttpDatasource();

describe('HQ endpoints are there and guarded', () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ['stats.getBranchStats', () => stats.getBranchStats()],
    ['stats.getGlobalInventory', () => stats.getGlobalInventory()],
    ['inventoryTransfer.getBranchInventory', () => transfers.getBranchInventory()],
    ['inventoryTransfer.getAll', () => transfers.getAll()],
    ['inventoryTransfer.create', () =>
      transfers.create({ productId: 'p18', fromBranchId: 1, toBranchId: 3, qty: 1 })],
    ['expenses.getAll', () => expenses.getAll()],
    ['expenses.create', () =>
      expenses.create({ branchId: 1, category: 'other', description: 'x', amount: 1 })],
    ['payroll.getEmployees', () => payroll.getEmployees()],
    ['payroll.getPeriods', () => payroll.getPeriods()],
    ['payroll.getAttendance', () => payroll.getAttendance()],
    ['payroll.getPayslips', () => payroll.getPayslips()],
    ['payroll.runPayroll', () => payroll.runPayroll('period-2')],
    ['invoicing.listCfdis', () => invoicing.listCfdis('2026-09')],
    ['invoicing.getSummary', () => invoicing.getSummary()],
    ['invoicing.cancel', () => invoicing.cancel('cfdi-1', '02')],
    ['invoicing.download', () => invoicing.download('cfdi-1', 'pdf')],
  ];

  it.each(calls)('%s hits a real route and is rejected with 401', async (_name, call) => {
    const status = await statusOf(call);
    expect(status).toBe(401);
    expect(status).not.toBe(404);
  });

  it('fails before hitting the network when there is no owner session', async () => {
    useAuthStore.getState().clear();

    await expect(stats.getBranchStats()).rejects.toThrow(/sin sesión/i);
  });
});
