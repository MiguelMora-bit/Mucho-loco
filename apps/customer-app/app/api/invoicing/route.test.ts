import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Cfdi, FiscalProfile, MemberCharge } from '@mucho-loco/types';

// Sesión simulada; el repositorio es el de verdad (mock por default), así se
// prueba la ruta completa contra las mismas reglas que ve la pantalla.
const getCurrentUserEmailMock = vi.fn();
vi.mock('@/lib/session', () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));

const { PUT } = await import('./fiscal-profile/route');
const { POST } = await import('./charges/[chargeId]/invoice/route');
const { GET } = await import('./invoices/[cfdiId]/[format]/route');
const { invoicingRepository } = await import('@/lib/repositories/invoicing.repository');
const { SAT_REJECTED_TAX_ID } = await import('@mucho-loco/customer-core/mock');

const VALID: FiscalProfile = {
  taxId: 'CUPU800825569',
  legalName: 'JUAN PÉREZ',
  taxSystem: '612',
  zip: '06700',
  cfdiUse: 'G03',
  email: null,
};

let n = 0;
let email: string;
beforeEach(() => {
  email = `ruta.${Date.now()}.${n++}@test.mx`;
  getCurrentUserEmailMock.mockReset();
  getCurrentUserEmailMock.mockResolvedValue(email);
});

const put = (body: unknown) =>
  PUT(new Request('http://localhost/api/invoicing/fiscal-profile', { method: 'PUT', body: JSON.stringify(body) }));
const invoice = (chargeId: string) =>
  POST(new Request('http://localhost/x', { method: 'POST' }), { params: Promise.resolve({ chargeId }) });
const download = (cfdiId: string, format: string) =>
  GET(new Request('http://localhost/x'), { params: Promise.resolve({ cfdiId, format }) });

async function firstWith(status: MemberCharge['invoice']['status']) {
  return (await invoicingRepository.getCharges(email)).find((c) => c.invoice.status === status)!;
}

describe('the invoicing routes require a verified session (middleware does not cover /api/*)', () => {
  it.each([
    ['PUT fiscal-profile', () => put(VALID)],
    ['POST invoice', () => invoice('x')],
    ['GET download', () => download('x', 'pdf')],
  ])('%s → 401', async (_name, call) => {
    getCurrentUserEmailMock.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'UNAUTHORIZED' });
  });
});

describe('PUT /api/invoicing/fiscal-profile', () => {
  it('saves normalized fiscal data for the session member', async () => {
    const res = await put({ ...VALID, taxId: ' cupu800825569 ', email: '' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(VALID);
    expect(await invoicingRepository.getFiscalProfile(email)).toEqual(VALID);
  });

  it('answers 400 with the bad fields and saves nothing', async () => {
    const res = await put({ ...VALID, taxId: 'abcd', zip: '1', taxSystem: '605', cfdiUse: 'G01' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'INVALID_FISCAL_PROFILE',
      fields: { taxId: true, zip: true, cfdiUse: true },
    });
    expect(await invoicingRepository.getFiscalProfile(email)).toBeNull();
  });

  it('ignores fields that are not in the contract', async () => {
    await put({ ...VALID, isAdmin: true });
    expect(await invoicingRepository.getFiscalProfile(email)).toEqual(VALID);
  });
});

describe('POST /api/invoicing/charges/[chargeId]/invoice', () => {
  it('issues the CFDI and returns the refreshed list', async () => {
    await put(VALID);
    const charge = await firstWith('available');

    const res = await invoice(charge.id);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { cfdi: Cfdi; charges: MemberCharge[] };
    expect(body.charges.find((c) => c.id === charge.id)!.invoice).toEqual({
      status: 'invoiced',
      cfdiId: body.cfdi.id,
      uuid: body.cfdi.uuid,
    });
  });

  it('a charge that changed state elsewhere answers its code plus the fresh list', async () => {
    await put(VALID);
    const charge = await firstWith('invoiced');

    const res = await invoice(charge.id);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('CHARGE_ALREADY_INVOICED');
    expect(body.charges).toHaveLength(5);
  });

  it('without fiscal data → 400 FISCAL_PROFILE_REQUIRED', async () => {
    const res = await invoice((await firstWith('available')).id);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('FISCAL_PROFILE_REQUIRED');
  });

  it("a SAT rejection → 422 with the SAT's reason", async () => {
    await put({ ...VALID, taxId: SAT_REJECTED_TAX_ID, taxSystem: '616', cfdiUse: 'S01' });
    const res = await invoice((await firstWith('available')).id);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('FISCAL_DATA_REJECTED');
    expect(body.detail).toMatch(/RFC/);
  });

  it('a non-business failure is rethrown, not disguised as a rejection', async () => {
    const spy = vi.spyOn(invoicingRepository, 'invoiceCharge').mockRejectedValueOnce(new Error('backend caído'));
    await expect(invoice('x')).rejects.toThrow('backend caído');
    spy.mockRestore();
  });
});

describe('GET /api/invoicing/invoices/[cfdiId]/[format]', () => {
  it('downloads their own invoice as an attachment, never cached', async () => {
    const cfdiId = (await firstWith('invoiced')).invoice.cfdiId!;
    const res = await download(cfdiId, 'pdf');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toMatch(/^attachment; filename=".+\.pdf"$/);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(new TextDecoder().decode(new Uint8Array(await res.arrayBuffer())).slice(0, 5)).toBe('%PDF-');
  });

  it("someone else's invoice → 404", async () => {
    const cfdiId = (await firstWith('invoiced')).invoice.cfdiId!;
    getCurrentUserEmailMock.mockResolvedValue(`otro.${Date.now()}@test.mx`);
    const res = await download(cfdiId, 'xml');
    expect(res.status).toBe(404);
  });

  it('an unknown format → 400', async () => {
    const res = await download('x', 'docx');
    expect(res.status).toBe(400);
  });
});
