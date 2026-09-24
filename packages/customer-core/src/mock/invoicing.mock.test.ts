import { describe, expect, it } from 'vitest';
import type { FiscalProfile, MemberCharge } from '@mucho-loco/types';
import { invoicingErrorOf } from '../invoicing-errors';
import { InvoicingMockDatasource, NO_CHARGES_TEST_EMAIL, SAT_REJECTED_TAX_ID } from './invoicing.mock';

// El estado del mock vive en globalThis y sobrevive entre tests: cada test
// usa su propio correo para no heredar lo que otro facturó.
let n = 0;
const fresh = () => `socio.${Date.now()}.${n++}@test.mx`;

const PROFILE: FiscalProfile = {
  taxId: 'CUPU800825569',
  legalName: 'JUAN PÉREZ',
  taxSystem: '612',
  zip: '06700',
  cfdiUse: 'G03',
  email: null,
};

const repo = new InvoicingMockDatasource();

async function codeOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return invoicingErrorOf(e);
  }
  throw new Error('expected a rejection');
}

const byStatus = (charges: MemberCharge[], status: MemberCharge['invoice']['status']) =>
  charges.filter((c) => c.invoice.status === status);

describe('InvoicingMockDatasource', () => {
  it('a new member has no fiscal data and one charge of every kind', async () => {
    const email = fresh();
    expect(await repo.getFiscalProfile(email)).toBeNull();

    const charges = await repo.getCharges(email);
    expect(charges).toHaveLength(5);
    expect(byStatus(charges, 'available')).toHaveLength(2);
    expect(byStatus(charges, 'invoiced')).toHaveLength(1);
    expect(byStatus(charges, 'closed')).toHaveLength(1);
    expect(byStatus(charges, 'unavailable')).toHaveLength(1);

    const paidAt = charges.map((c) => c.paidAt);
    expect(paidAt).toEqual([...paidAt].sort().reverse());
  });

  it('has a member with no charges at all, for the empty screen', async () => {
    expect(await repo.getCharges(NO_CHARGES_TEST_EMAIL)).toEqual([]);
  });

  // Mismo contrato que el backend: si el mock trae una llave de más o de
  // menos, prender DATA_SOURCE=http cambiaría la pantalla.
  it('every charge has exactly the MemberCharge keys, and a folio only when invoiced', async () => {
    for (const c of await repo.getCharges(fresh())) {
      expect(Object.keys(c).sort()).toEqual(['description', 'id', 'invoice', 'paidAt', 'total']);
      expect(Object.keys(c.invoice).sort()).toEqual(['cfdiId', 'status', 'uuid']);
      expect(c.invoice.uuid !== null).toBe(c.invoice.status === 'invoiced');
      expect(new Date(c.paidAt).toISOString()).toBe(c.paidAt);
    }
  });

  it('saves fiscal data the way the SAT writes it', async () => {
    const email = fresh();
    const saved = await repo.saveFiscalProfile(email, {
      ...PROFILE,
      taxId: '  cupu800825569 ',
      legalName: ' juan pérez ',
      email: '',
    });
    expect(saved).toEqual({ ...PROFILE, email: null });
    expect(await repo.getFiscalProfile(email)).toEqual(saved);
  });

  it('cannot invoice without fiscal data', async () => {
    const email = fresh();
    const [charge] = byStatus(await repo.getCharges(email), 'available');
    expect(await codeOf(repo.invoiceCharge(email, charge.id))).toEqual({ code: 'FISCAL_PROFILE_REQUIRED' });
  });

  it('invoices an available charge once', async () => {
    const email = fresh();
    await repo.saveFiscalProfile(email, PROFILE);
    const [charge] = byStatus(await repo.getCharges(email), 'available');

    const cfdi = await repo.invoiceCharge(email, charge.id);
    expect(cfdi.uuid).toMatch(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/);
    expect(cfdi).toMatchObject({ kind: 'individual', status: 'valid', total: charge.total, customerTaxId: PROFILE.taxId });

    const after = (await repo.getCharges(email)).find((c) => c.id === charge.id)!;
    expect(after.invoice).toEqual({ status: 'invoiced', cfdiId: cfdi.id, uuid: cfdi.uuid });

    expect(await codeOf(repo.invoiceCharge(email, charge.id))).toEqual({ code: 'CHARGE_ALREADY_INVOICED' });
  });

  it('rejects the charges that cannot be invoiced, each with its reason', async () => {
    const email = fresh();
    await repo.saveFiscalProfile(email, PROFILE);
    const charges = await repo.getCharges(email);

    expect(await codeOf(repo.invoiceCharge(email, byStatus(charges, 'closed')[0].id))).toEqual({
      code: 'INVOICING_WINDOW_CLOSED',
    });
    expect(await codeOf(repo.invoiceCharge(email, byStatus(charges, 'unavailable')[0].id))).toEqual({
      code: 'CHARGE_NOT_INVOICEABLE',
    });
    expect(await codeOf(repo.invoiceCharge(email, 'no-existe'))).toEqual({ code: 'CHARGE_NOT_FOUND' });
  });

  it("someone else's charge is the same as one that does not exist", async () => {
    const owner = fresh();
    const other = fresh();
    await repo.saveFiscalProfile(other, PROFILE);
    const [charge] = byStatus(await repo.getCharges(owner), 'available');

    expect(await codeOf(repo.invoiceCharge(other, charge.id))).toEqual({ code: 'CHARGE_NOT_FOUND' });
  });

  it('the SAT rejects the generic RFC with its reason, and the charge stays available', async () => {
    const email = fresh();
    await repo.saveFiscalProfile(email, { ...PROFILE, taxId: SAT_REJECTED_TAX_ID, taxSystem: '616', cfdiUse: 'S01' });
    const [charge] = byStatus(await repo.getCharges(email), 'available');

    const rejection = await codeOf(repo.invoiceCharge(email, charge.id));
    expect(rejection?.code).toBe('FISCAL_DATA_REJECTED');
    expect(rejection?.detail).toMatch(/RFC/);

    const after = (await repo.getCharges(email)).find((c) => c.id === charge.id)!;
    expect(after.invoice.status).toBe('available');
  });

  it('downloads only their own invoices', async () => {
    const email = fresh();
    const invoiced = byStatus(await repo.getCharges(email), 'invoiced')[0];
    const cfdiId = invoiced.invoice.cfdiId!;

    const pdf = await repo.downloadInvoice(email, cfdiId, 'pdf');
    expect(pdf.contentType).toBe('application/pdf');
    expect(new TextDecoder().decode(pdf.data.slice(0, 5))).toBe('%PDF-');
    expect(pdf.filename).toMatch(/\.pdf$/);

    const xml = await repo.downloadInvoice(email, cfdiId, 'xml');
    expect(xml.contentType).toBe('application/xml');
    expect(new TextDecoder().decode(xml.data)).toContain(invoiced.invoice.uuid!);

    expect(await codeOf(repo.downloadInvoice(fresh(), cfdiId, 'pdf'))).toEqual({ code: 'CFDI_NOT_FOUND' });
  });

  it('the folio of the global invoice is not theirs to download', async () => {
    const email = fresh();
    const closed = byStatus(await repo.getCharges(email), 'closed')[0];
    expect(closed.invoice.uuid).toBeNull();
    if (closed.invoice.cfdiId) {
      expect(await codeOf(repo.downloadInvoice(email, closed.invoice.cfdiId, 'pdf'))).toEqual({
        code: 'CFDI_NOT_FOUND',
      });
    }
  });
});
