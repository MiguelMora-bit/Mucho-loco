import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StatsHttpDatasource } from './stats.http';
import { InventoryTransferHttpDatasource } from './inventoryTransfer.http';
import { ExpensesHttpDatasource } from './expenses.http';
import { ExpenseNotFoundError } from '../../repositories/expenses.errors';
import { PayrollHttpDatasource } from './payroll.http';
import { ShipmentsHttpDatasource } from './shipments.http';
import { ShipmentStateError } from '../../repositories/shipments.errors';
import { CashAuditHttpDatasource } from './cashAudit.http';
import { ApiRequestError } from './client';
import {
  InsufficientStockError,
  SameBranchError,
} from '../../repositories/inventoryTransfer.errors';
import {
  PeriodAlreadyClosedError,
  PeriodAlreadyOpenError,
  PeriodNotFoundError,
} from '../../repositories/payroll.errors';
import { useAuthStore } from '../../stores/auth.store';

function stubFetch(status = 200, body: string | unknown = '[]') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const spy = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(text === '' ? null : text, {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const call = (spy: ReturnType<typeof stubFetch>, i = 0) => ({
  url: String(spy.mock.calls[i][0]),
  init: (spy.mock.calls[i][1] ?? {}) as RequestInit,
  auth: ((spy.mock.calls[i][1]?.headers ?? {}) as Record<string, string>).Authorization,
  body: JSON.parse(String((spy.mock.calls[i][1] as RequestInit)?.body ?? '{}')) as Record<string, unknown>,
});

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.test');
  useAuthStore.getState().setSession({
    user: { email: 'rodrigo@mucholoco.mx', name: 'Rodrigo' },
    idToken: 'owner-token',
    refreshToken: 'r',
    idTokenExp: Math.floor(Date.now() / 1000) + 3600,
  });
});

afterEach(() => {
  useAuthStore.getState().clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('StatsHttpDatasource', () => {
  it('maps both methods to their backend routes, with the owner token', async () => {
    const spy = stubFetch();
    const ds = new StatsHttpDatasource();

    await ds.getBranchStats();
    await ds.getGlobalInventory();
    await ds.getAccessAlerts();

    expect(call(spy, 0).url).toContain('http://api.test/stats/branches');
    expect(call(spy, 1).url).toContain('http://api.test/inventory/global');
    // Spec 020.
    expect(call(spy, 2).url).toContain('http://api.test/access-alerts');
    expect(call(spy, 0).auth).toBe('Bearer owner-token');
  });

  // El inventario global aplana nombres de producto, así que el backend
  // necesita saber el idioma.
  it('tells the backend which language to flatten product names into', async () => {
    const spy = stubFetch();
    await new StatsHttpDatasource().getGlobalInventory();

    expect(call(spy).url).toContain('lang=');
  });
});

describe('InventoryTransferHttpDatasource', () => {
  const ds = new InventoryTransferHttpDatasource();

  it('maps every method to its backend route', async () => {
    const spy = stubFetch();

    await ds.getBranchInventory();
    await ds.getAll();
    await ds.create({ productId: 'p18', fromBranchId: 1, toBranchId: 3, qty: 15 });

    expect(call(spy, 0).url).toContain('http://api.test/inventory?');
    expect(call(spy, 1).url).toContain('http://api.test/inventory/transfers');
    expect(call(spy, 2).init.method).toBe('POST');
    expect(call(spy, 2).body).toEqual({
      productId: 'p18',
      fromBranchId: 1,
      toBranchId: 3,
      qty: 15,
    });
  });

  it('translates the transfer error codes into the contract types', async () => {
    stubFetch(400, { code: 'SAME_BRANCH_TRANSFER' });
    const same = await ds
      .create({ productId: 'p18', fromBranchId: 1, toBranchId: 1, qty: 1 })
      .catch((e: unknown) => e);
    expect(same).toBeInstanceOf(SameBranchError);

    stubFetch(400, { code: 'INSUFFICIENT_STOCK', productId: 'p18', productName: 'Shaker Loco · 700ml' });
    const short = await ds
      .create({ productId: 'p18', fromBranchId: 1, toBranchId: 3, qty: 9999 })
      .catch((e: unknown) => e);
    expect(short).toBeInstanceOf(InsufficientStockError);
    expect((short as InsufficientStockError).productName).toBe('Shaker Loco · 700ml');
  });

  // Para HQ es el mismo problema: no hay de dónde sacar ese producto.
  it('treats a source branch that does not stock the product as insufficient stock', async () => {
    stubFetch(404, { code: 'BRANCH_DOES_NOT_STOCK_PRODUCT', branchId: 3, productId: 'p1' });

    const err = await ds
      .create({ productId: 'p1', fromBranchId: 3, toBranchId: 1, qty: 1 })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(InsufficientStockError);
  });

  it('lets an unexpected failure through untranslated', async () => {
    stubFetch(500, { message: 'boom' });

    const err = await ds
      .create({ productId: 'p18', fromBranchId: 1, toBranchId: 3, qty: 1 })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiRequestError);
  });
});

describe('ExpensesHttpDatasource', () => {
  it('maps both methods to their backend routes', async () => {
    const spy = stubFetch();
    const ds = new ExpensesHttpDatasource();

    await ds.getAll();
    await ds.create({ branchId: 1, category: 'utilities', description: 'CFE', amount: 1200 });

    expect(call(spy, 0).url).toContain('http://api.test/expenses');
    expect(call(spy, 1).init.method).toBe('POST');
  });

  // null es una elección explícita del dueño ("esto es de toda la cadena"), no
  // un campo sin llenar — tiene que viajar, no omitirse.
  it('sends a corporate expense with branchId explicitly null', async () => {
    const spy = stubFetch(201, {});
    await new ExpensesHttpDatasource().create({
      branchId: null,
      category: 'marketing',
      description: 'Campaña nacional',
      amount: 22000,
    });

    expect(call(spy).body).toHaveProperty('branchId', null);
  });

  // Spec 054: corregir y borrar, con la fecha solo si se eligió.
  it('puts a correction and deletes, translating EXPENSE_NOT_FOUND', async () => {
    const spy = stubFetch(200, {});
    const ds = new ExpensesHttpDatasource();
    await ds.update('exp-1', { branchId: 1, category: 'rent', description: 'Renta', amount: 1200, date: '2026-09-03' });
    expect(new URL(call(spy).url).pathname).toBe('/expenses/exp-1');
    expect(call(spy).init.method).toBe('PUT');
    expect(call(spy).body).toEqual({ branchId: 1, category: 'rent', description: 'Renta', amount: 1200, date: '2026-09-03' });

    const noDate = stubFetch(200, {});
    await ds.update('exp-1', { branchId: 1, category: 'rent', description: 'Renta', amount: 1200 });
    expect(call(noDate).body).not.toHaveProperty('date');

    const del = stubFetch(204, '');
    await ds.remove('exp-1');
    expect(call(del).init.method).toBe('DELETE');

    stubFetch(404, { code: 'EXPENSE_NOT_FOUND', expenseId: 'exp-1' });
    const missing = await ds.remove('exp-1').catch((e: unknown) => e);
    expect(missing).toBeInstanceOf(ExpenseNotFoundError);
  });
});

describe('PayrollHttpDatasource', () => {
  const ds = new PayrollHttpDatasource();

  it('maps every method to its backend route', async () => {
    const spy = stubFetch();

    await ds.getEmployees();
    await ds.getPeriods();
    await ds.getAttendance();
    await ds.getPayslips();
    await ds.runPayroll('period-2');

    expect(call(spy, 0).url).toContain('/payroll/employees');
    expect(call(spy, 1).url).toContain('/payroll/periods');
    expect(call(spy, 2).url).toContain('/payroll/attendance');
    expect(call(spy, 3).url).toContain('/payroll/payslips');
    expect(call(spy, 4).url).toContain('/payroll/periods/period-2/run');
    expect(call(spy, 4).init.method).toBe('POST');
  });

  // Correr la nómina deja de calcular en el navegador: el backend emite los
  // recibos y los guarda. Lo único que sube es el id del periodo.
  it('asks the backend to issue the payslips instead of computing them', async () => {
    const spy = stubFetch(201, []);
    await ds.runPayroll('period-2');

    expect(call(spy).body).toEqual({});
  });

  it('translates the period error codes into the contract types', async () => {
    stubFetch(404, { code: 'PERIOD_NOT_FOUND', periodId: 'nope' });
    const missing = await ds.runPayroll('nope').catch((e: unknown) => e);
    expect(missing).toBeInstanceOf(PeriodNotFoundError);
    expect((missing as PeriodNotFoundError).periodId).toBe('nope');

    stubFetch(400, { code: 'PERIOD_ALREADY_CLOSED', periodId: 'period-1' });
    const closed = await ds.runPayroll('period-1').catch((e: unknown) => e);
    expect(closed).toBeInstanceOf(PeriodAlreadyClosedError);
  });

  it('opens the next period with a bodiless POST and reads PERIOD_ALREADY_OPEN (spec 050)', async () => {
    const spy = stubFetch(201, { id: 'p3', startDate: '2026-09-01', endDate: '2026-09-15', totalDays: 15, status: 'open' });
    expect((await ds.openNextPeriod()).startDate).toBe('2026-09-01');
    expect(call(spy).url).toMatch(/^http:\/\/api\.test\/payroll\/periods\/next(\?|$)/);
    expect(call(spy).init.method).toBe('POST');

    stubFetch(409, { code: 'PERIOD_ALREADY_OPEN', periodId: 'period-2' });
    const open = await ds.openNextPeriod().catch((e: unknown) => e);
    expect(open).toBeInstanceOf(PeriodAlreadyOpenError);
    expect((open as PeriodAlreadyOpenError).periodId).toBe('period-2');
  });
});

describe('ShipmentsHttpDatasource', () => {
  const ds = new ShipmentsHttpDatasource();

  it('maps every method to its backend route, with the owner token', async () => {
    const spy = stubFetch(200, {});

    await ds.getAll();
    await ds.markShipped('order-1', '1Z999');
    await ds.markDelivered('order-1');

    expect(call(spy, 0).url).toContain('/shipments');
    expect(call(spy, 0).auth).toBe('Bearer owner-token');
    expect(call(spy, 1).url).toContain('/shipments/order-1/ship');
    expect(call(spy, 1).init.method).toBe('POST');
    expect(call(spy, 1).body).toEqual({ trackingNumber: '1Z999' });
    expect(call(spy, 2).url).toContain('/shipments/order-1/deliver');
  });

  it('does not send an empty tracking number', async () => {
    const spy = stubFetch(200, {});
    await ds.markShipped('order-1');

    expect(call(spy).body).toEqual({});
  });

  it('translates the state error codes into the contract type', async () => {
    stubFetch(400, { code: 'ORDER_ALREADY_SHIPPED', orderId: 'order-1' });
    const twice = await ds.markShipped('order-1').catch((e: unknown) => e);
    expect(twice).toBeInstanceOf(ShipmentStateError);
    expect((twice as ShipmentStateError).reason).toBe('already_shipped');

    stubFetch(400, { code: 'ORDER_NOT_SHIPPED', orderId: 'order-1' });
    const early = await ds.markDelivered('order-1').catch((e: unknown) => e);
    expect((early as ShipmentStateError).reason).toBe('not_shipped');
  });

  it('lets any other failure through untouched', async () => {
    stubFetch(500, { message: 'boom' });
    const failure = await ds.getAll().catch((e: unknown) => e);
    expect(failure).not.toBeInstanceOf(ShipmentStateError);
  });
});

describe('CashAuditHttpDatasource (spec 052)', () => {
  const ds = new CashAuditHttpDatasource();

  it('asks for the month and branch, and reuses the shift transactions route', async () => {
    const spy = stubFetch(200, []);
    await ds.getShifts('2026-09', 3);
    await ds.getShifts('2026-09');
    await ds.getTransactions('shift-1');

    const first = new URL(call(spy, 0).url);
    expect(first.pathname).toBe('/cash-register/audit');
    expect(first.searchParams.get('month')).toBe('2026-09');
    expect(first.searchParams.get('branchId')).toBe('3');
    expect(new URL(call(spy, 1).url).searchParams.has('branchId')).toBe(false);
    expect(new URL(call(spy, 2).url).pathname).toBe('/cash-register/shifts/shift-1/transactions');
  });
});
