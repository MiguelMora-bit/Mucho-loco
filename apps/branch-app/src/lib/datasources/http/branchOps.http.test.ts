import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PickupOrderHttpDatasource } from './pickupOrder.http';
import { CashRegisterShiftHttpDatasource } from './cashRegisterShift.http';
import { AttendanceHttpDatasource } from './attendance.http';
import { ReportsHttpDatasource } from './reports.http';
import { MembershipHttpDatasource } from './membership.http';
import { ApiRequestError } from './client';
import {
  ShiftAlreadyClosedError,
  ShiftNotFoundError,
} from '../../repositories/cashRegisterShift.errors';
import { AlreadyClockedInError, NoOpenEntryError } from '../../repositories/attendance.errors';
import { useAuthStore } from '../../stores/auth.store';
import {
  MemberRenewsOnlineError,
  NothingOverdueError,
  OverduePaymentFailedError,
} from '../../repositories/membership.errors';

/** `body` como texto crudo para poder simular una respuesta 200 SIN cuerpo. */
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
  body: JSON.parse(String((spy.mock.calls[i][1] as RequestInit)?.body ?? '{}')) as Record<string, unknown>,
});

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.test');
  useAuthStore.getState().setSession({
    user: { email: 'luis@mucholoco.mx', name: 'Luis', role: 'staff', branchId: 1, branchName: 'Roma Sur' },
    idToken: 'id-token',
    refreshToken: 'r',
    idTokenExp: Math.floor(Date.now() / 1000) + 3600,
  });
});

afterEach(() => {
  useAuthStore.getState().clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('PickupOrderHttpDatasource', () => {
  it('maps both methods to their backend routes', async () => {
    const spy = stubFetch();
    const ds = new PickupOrderHttpDatasource();

    await ds.getByBranch(3);
    await ds.markDelivered('order-1');

    expect(call(spy, 0).url).toContain('http://api.test/branches/3/pickup-orders');
    expect(call(spy, 1).url).toContain('http://api.test/pickup-orders/order-1/deliver');
    expect(call(spy, 1).init.method).toBe('POST');
  });
});

describe('CashRegisterShiftHttpDatasource', () => {
  const ds = new CashRegisterShiftHttpDatasource();

  it('maps every method to its backend route', async () => {
    const spy = stubFetch();

    await ds.getOpenShift(2);
    await ds.getTransactions('shift-1');
    await ds.getHistory(2);
    await ds.closeShift('shift-1');

    expect(call(spy, 0).url).toContain('/branches/2/cash-register/open-shift');
    expect(call(spy, 1).url).toContain('/cash-register/shifts/shift-1/transactions');
    expect(call(spy, 2).url).toContain('/branches/2/cash-register/history');
    expect(call(spy, 3).url).toContain('/cash-register/shifts/shift-1/close');
    expect(call(spy, 3).init.method).toBe('POST');
  });

  // El contrato promete errores tipados para que la UI no lea prosa — el
  // código del backend es lo que hace posible traducirlos.
  it('translates the shift error codes into the contract types', async () => {
    stubFetch(404, { code: 'SHIFT_NOT_FOUND', shiftId: 'shift-9' });
    const notFound = await ds.closeShift('shift-9').catch((e: unknown) => e);
    expect(notFound).toBeInstanceOf(ShiftNotFoundError);
    expect((notFound as ShiftNotFoundError).shiftId).toBe('shift-9');

    stubFetch(400, { code: 'SHIFT_ALREADY_CLOSED', shiftId: 'shift-1' });
    const closed = await ds.closeShift('shift-1').catch((e: unknown) => e);
    expect(closed).toBeInstanceOf(ShiftAlreadyClosedError);
  });

  // Un 500 no es un error de negocio: disfrazarlo de "turno ya cerrado" le
  // mentiría al gerente sobre por qué no pudo cuadrar la caja.
  it('lets an unexpected failure through untranslated', async () => {
    stubFetch(500, { message: 'boom' });

    const err = await ds.closeShift('shift-1').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiRequestError);
  });
});

describe('AttendanceHttpDatasource', () => {
  const ds = new AttendanceHttpDatasource();

  it('maps every method to its backend route', async () => {
    const spy = stubFetch();

    await ds.getOpenEntry('luis@mucholoco.mx');
    await ds.clockIn(1, 'luis@mucholoco.mx', 'Luis Ángel Ortega');
    await ds.clockOut('luis@mucholoco.mx');
    await ds.getTeamToday(1);

    expect(call(spy, 0).url).toContain('/attendance/open?');
    expect(call(spy, 0).url).toContain('staffEmail=luis%40mucholoco.mx');
    expect(call(spy, 1).url).toContain('/branches/1/attendance/clock-in');
    expect(call(spy, 2).url).toContain('/attendance/clock-out');
    expect(call(spy, 3).url).toContain('/branches/1/attendance/today');
  });

  // Mostrador ficha en una tablet compartida: quien ficha no es
  // necesariamente el dueño del token, así que el email va explícito.
  it('sends who is clocking in, not just the token holder', async () => {
    const spy = stubFetch();
    await ds.clockIn(1, 'ana@mucholoco.mx', 'Ana Sofía Martínez');

    expect(call(spy).body).toEqual({
      staffEmail: 'ana@mucholoco.mx',
      staffName: 'Ana Sofía Martínez',
    });
  });

  // El backend responde 200 con cuerpo VACÍO cuando no hay turno abierto.
  // Sin manejarlo, `res.json()` tira un SyntaxError que no dice nada útil.
  it('reads an empty 200 as null, not as a crash', async () => {
    stubFetch(200, '');

    await expect(ds.getOpenEntry('luis@mucholoco.mx')).resolves.toBeNull();
  });

  it('translates the attendance error codes into the contract types', async () => {
    stubFetch(400, { code: 'ALREADY_CLOCKED_IN', staffEmail: 'luis@mucholoco.mx' });
    const dup = await ds.clockIn(1, 'luis@mucholoco.mx', 'Luis').catch((e: unknown) => e);
    expect(dup).toBeInstanceOf(AlreadyClockedInError);
    expect((dup as AlreadyClockedInError).staffEmail).toBe('luis@mucholoco.mx');

    stubFetch(404, { code: 'NO_OPEN_ENTRY', staffEmail: 'luis@mucholoco.mx' });
    const none = await ds.clockOut('luis@mucholoco.mx').catch((e: unknown) => e);
    expect(none).toBeInstanceOf(NoOpenEntryError);
  });
});

describe('ReportsHttpDatasource', () => {
  // El mock se traía TODAS las ventas al navegador para sumarlas; ahora la
  // cuenta la hace el backend y solo viaja el resultado.
  it('asks the backend for the window instead of aggregating locally', async () => {
    const spy = stubFetch();
    await new ReportsHttpDatasource().getSalesReport(1, 30);

    expect(call(spy).url).toContain('/branches/1/reports/sales?');
    expect(call(spy).url).toContain('days=30');
  });
});

describe('MembershipHttpDatasource', () => {
  const ds = new MembershipHttpDatasource();

  // Un accessCode es único en toda la cadena, así que la búsqueda no lleva
  // sucursal en la ruta.
  it('looks a member up outside any branch scope', async () => {
    const spy = stubFetch(200, '');
    await ds.findMember('ML-DIEGO-2026-ALLGYMS');

    expect(call(spy).url).toContain('http://api.test/members?');
    expect(call(spy).url).toContain('qrCode=ML-DIEGO-2026-ALLGYMS');
  });

  it('trims the scanned code — a physical reader can append whitespace', async () => {
    const spy = stubFetch(200, '');
    await ds.findMember('  ML-DIEGO-2026-ALLGYMS\n');

    expect(call(spy).url).not.toContain('%0A');
  });

  it('returns null for an unknown member instead of crashing on an empty body', async () => {
    stubFetch(200, '');

    await expect(ds.findMember('ML-QR-NADIE')).resolves.toBeNull();
  });

  // El backend cobra según la sucursal de la ruta; mandarle el nombre sería
  // dejar que el cliente influya en el precio.
  it('never sends the branch name — the backend prices from the branch id', async () => {
    const spy = stubFetch(201, {});
    await ds.renewMembership(5, 'Santa Fe', 'ML-DIEGO-2026-ALLGYMS', 'all', 'monthly', 'card');

    expect(call(spy).url).toContain('/branches/5/memberships/renew');
    expect(call(spy).body).toEqual({
      qrCode: 'ML-DIEGO-2026-ALLGYMS',
      tierKey: 'all',
      periodKey: 'monthly',
      paymentMethod: 'card',
    });
    expect(String(call(spy).init.body)).not.toContain('Santa Fe');
  });

  // Spec 019: el atraso de una suscripción en gracia se consulta y se cobra en mostrador.
  it('asks for the overdue balance by QR and reads NOTHING_TO_PAY as null', async () => {
    const spy = stubFetch(200, { amount: 1550, tierKey: 'all', periodKey: 'monthly' });
    await expect(ds.getOverdue(3, ' ML-QR-SOFIA07 ')).resolves.toEqual({ amount: 1550, tierKey: 'all', periodKey: 'monthly' });
    expect(call(spy).url).toContain('/branches/3/memberships/overdue?');
    expect(call(spy).url).toContain('qrCode=ML-QR-SOFIA07');

    stubFetch(409, { code: 'NOTHING_TO_PAY' });
    await expect(ds.getOverdue(3, 'ML-QR-ANA02')).resolves.toBeNull();
  });

  it('settles the overdue balance without an amount, and types its rejections', async () => {
    const spy = stubFetch(201, { id: 'mp-1' });
    await ds.settleOverdue(1, 'ML-QR-SOFIA07', 'card', 'debit');
    expect(call(spy).url).toContain('/branches/1/memberships/overdue');
    expect(call(spy).init.method).toBe('POST');
    expect(call(spy).body).toEqual({ qrCode: 'ML-QR-SOFIA07', paymentMethod: 'card', cardType: 'debit' });

    stubFetch(409, { code: 'NOTHING_TO_PAY' });
    await expect(ds.settleOverdue(1, 'ML-QR-SOFIA07', 'cash')).rejects.toBeInstanceOf(NothingOverdueError);
    stubFetch(502, { code: 'PAYMENT_PROVIDER_ERROR' });
    await expect(ds.settleOverdue(1, 'ML-QR-SOFIA07', 'cash')).rejects.toBeInstanceOf(OverduePaymentFailedError);
  });

  it('reads MEMBER_RENEWS_ONLINE as the typed error the mock throws (spec 006)', async () => {
    stubFetch(409, { code: 'MEMBER_RENEWS_ONLINE' });
    await expect(
      ds.renewMembership(1, 'Roma Sur', 'ML-DIEGO-2026-ALLGYMS', 'all', 'monthly', 'cash'),
    ).rejects.toBeInstanceOf(MemberRenewsOnlineError);
  });

  it('posts a signup without a fingerprint when there is none', async () => {
    const spy = stubFetch(201, {});
    await ds.signUpNewMember(1, 'Roma Sur', {
      memberName: 'Nuevo Socio',
      phone: '55 0000 0000',
      tierKey: 'single',
      periodKey: 'monthly',
      paymentMethod: 'cash',
    });

    expect(call(spy).body).not.toHaveProperty('fingerprintId');
  });

  // El alta por huella es para socios sin app (ver CLAUDE.md raíz).
  it('includes the fingerprint when the member enrolled with one', async () => {
    const spy = stubFetch(201, {});
    await ds.signUpNewMember(1, 'Roma Sur', {
      memberName: 'Socio Con Huella',
      phone: '55 1111 1111',
      tierKey: 'all',
      periodKey: 'annual',
      paymentMethod: 'cash',
      fingerprintId: 'fp-1',
    });

    expect(call(spy).body.fingerprintId).toBe('fp-1');
  });
});
