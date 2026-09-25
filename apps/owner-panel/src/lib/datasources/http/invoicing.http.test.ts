import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InvoicingHttpDatasource } from './invoicing.http';
import { ApiRequestError } from './client';
import {
  CancellationRejectedError,
  CfdiAlreadyCanceledError,
  InvoicingUnavailableError,
} from '../../repositories/invoicing.errors';
import { useAuthStore } from '../../stores/auth.store';

function stubFetch(status = 200, body: unknown = []) {
  const spy = vi.fn(
    async (...args: [string | URL, RequestInit?]) =>
      args && new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

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

describe('InvoicingHttpDatasource', () => {
  it('lists the month with the owner token', async () => {
    const spy = stubFetch(200, []);
    await new InvoicingHttpDatasource().listCfdis('2026-09');
    const url = new URL(String(spy.mock.calls[0][0]));
    expect(url.pathname).toBe('/invoicing/cfdis');
    expect(url.searchParams.get('month')).toBe('2026-09');
    expect((spy.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer owner-token');
  });

  it('reads the receipts summary', async () => {
    const spy = stubFetch(200, { receipts: {} });
    await new InvoicingHttpDatasource().getSummary();
    expect(new URL(String(spy.mock.calls[0][0])).pathname).toBe('/invoicing/summary');
  });

  it('cancels with the SAT motive, escaping the id', async () => {
    const spy = stubFetch(200, { id: 'c 1' });
    await new InvoicingHttpDatasource().cancel('c 1', '02');
    expect(new URL(String(spy.mock.calls[0][0])).pathname).toBe('/invoicing/cfdis/c%201/cancel');
    expect(spy.mock.calls[0][1]?.method).toBe('POST');
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({ motive: '02' });
  });

  it.each([
    [422, { code: 'CANCELLATION_REJECTED', detail: 'El receptor no aceptó' }, CancellationRejectedError],
    [409, { code: 'CFDI_ALREADY_CANCELED' }, CfdiAlreadyCanceledError],
    [503, { code: 'INVOICING_UNAVAILABLE' }, InvoicingUnavailableError],
    [502, { code: 'INVOICING_PROVIDER_ERROR' }, InvoicingUnavailableError],
  ])('%s %o becomes a typed error', async (status, body, type) => {
    stubFetch(status, body);
    await expect(new InvoicingHttpDatasource().cancel('c1', '03')).rejects.toBeInstanceOf(type);
  });

  it("keeps the SAT's reason on a rejected cancellation", async () => {
    stubFetch(422, { code: 'CANCELLATION_REJECTED', detail: 'El receptor no aceptó' });
    await expect(new InvoicingHttpDatasource().cancel('c1', '02')).rejects.toMatchObject({ detail: 'El receptor no aceptó' });
  });

  it('a dead backend is not a business rejection', async () => {
    stubFetch(500, { message: 'boom' });
    await expect(new InvoicingHttpDatasource().cancel('c1', '02')).rejects.toBeInstanceOf(ApiRequestError);
  });

  it('downloads the bytes of a CFDI', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([0x25, 0x50]), { status: 200, headers: { 'Content-Type': 'application/pdf' } })),
    );
    const file = await new InvoicingHttpDatasource().download('c1', 'pdf');
    expect(file).toMatchObject({ contentType: 'application/pdf', filename: 'cfdi-c1.pdf' });
    expect(Array.from(file.data)).toEqual([0x25, 0x50]);
  });
});
