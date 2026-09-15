import type { ChargeLine, FiscalProfile, FiscalReceipt } from '@prisma/client';
import type { Invoice } from 'facturapi';
import {
  PAYMENT_FORM,
  cfdiFromInvoice,
  customerFromProfile,
  receiptItems,
  receiptStatus,
  toMemberCharge,
} from './fiscal-mapping';

const line = (overrides: Partial<ChargeLine> = {}): ChargeLine => ({
  id: 'l1',
  chargeId: 'c1',
  description: 'Pre-Entreno Bestia · Mango Chamoy',
  qty: 2,
  unitPriceCents: 64950,
  taxCategoryId: 'supplement',
  satProductKey: '50501500',
  satUnitKey: 'H87',
  taxRateBp: 1600,
  ...overrides,
});

describe('fiscal mapping', () => {
  it('tells the SAT how the money came in — and debit is not credit', () => {
    expect(PAYMENT_FORM.card_credit).toBe('04');
    expect(PAYMENT_FORM.card_debit).toBe('28');
    expect(PAYMENT_FORM.cash).toBe('01');
    // En OXXO el cliente paga en efectivo, aunque el que cobra sea Stripe.
    expect(PAYMENT_FORM.oxxo).toBe('01');
    expect(PAYMENT_FORM.spei).toBe('03');
  });

  it('turns ledger lines into CFDI concepts with the fiscal data frozen at charge time', () => {
    expect(receiptItems([line()])).toEqual([
      {
        quantity: 2,
        product: {
          description: 'Pre-Entreno Bestia · Mango Chamoy',
          product_key: '50501500',
          unit_key: 'H87',
          price: 649.5,
          tax_included: true,
          taxes: [{ type: 'IVA', rate: 0.16 }],
        },
      },
    ]);
  });

  describe('customerFromProfile', () => {
    const profile: FiscalProfile = {
      userId: 'u1',
      taxId: 'RAMD900101AB1',
      legalName: 'DIEGO RAMIREZ',
      taxSystem: '605',
      zip: '06700',
      cfdiUse: 'G03',
      email: null,
      updatedAt: new Date(),
    };

    it('sends the four data points the SAT checks, to the account email when none was captured', () => {
      expect(customerFromProfile(profile, 'diego@mucholoco.mx')).toEqual({
        legal_name: 'DIEGO RAMIREZ',
        tax_id: 'RAMD900101AB1',
        tax_system: '605',
        address: { zip: '06700' },
        email: 'diego@mucholoco.mx',
      });
    });

    it('prefers the email captured for invoices', () => {
      expect(
        customerFromProfile(
          { ...profile, email: 'conta@empresa.mx' },
          'diego@mucholoco.mx',
        ).email,
      ).toBe('conta@empresa.mx');
    });

    it('omits the email when there is none at all', () => {
      expect(customerFromProfile(profile, null)).not.toHaveProperty('email');
    });
  });

  it('does not move a receipt to a status it does not know', () => {
    expect(receiptStatus('invoiced_globally')).toBe('invoiced_globally');
    expect(receiptStatus('some_new_status')).toBeNull();
  });

  describe('cfdiFromInvoice', () => {
    const invoice = (overrides: Record<string, unknown> = {}) =>
      ({
        id: 'inv_1',
        uuid: 'UUID-1',
        status: 'valid',
        cancellation_status: 'none',
        total: 1299.99,
        customer: { tax_id: 'RAMD900101AB1', legal_name: 'DIEGO RAMIREZ' },
        date: '2026-09-15T18:00:00.000Z',
        global: null,
        ...overrides,
      }) as unknown as Invoice;

    it('stores the total in cents without float drift', () => {
      expect(cfdiFromInvoice(invoice()).totalCents).toBe(129999);
    });

    it('tells a global invoice from an individual one', () => {
      expect(cfdiFromInvoice(invoice()).kind).toBe('individual');
      expect(
        cfdiFromInvoice(
          invoice({
            global: { periodicity: 'month', months: '09', year: 2026 },
          }),
        ).kind,
      ).toBe('global');
    });

    // Pedir la cancelación no la cancela: a veces el receptor tiene que aceptarla.
    it('marks it canceled only once it actually is', () => {
      expect(
        cfdiFromInvoice(invoice({ cancellation_status: 'pending' })).status,
      ).toBe('valid');
      expect(
        cfdiFromInvoice(
          invoice({ status: 'canceled', cancellation_status: 'accepted' }),
        ).status,
      ).toBe('canceled');
    });
  });

  describe('toMemberCharge', () => {
    const receipt = (
      status: FiscalReceipt['status'],
      cfdiId: string | null = null,
    ): FiscalReceipt => ({
      chargeId: 'c1',
      status,
      attempts: 1,
      nextAttemptAt: new Date(),
      lastError: null,
      facturapiId: 'rcpt_1',
      key: 'KEY1',
      selfInvoiceUrl: null,
      expiresAt: null,
      cfdiId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const charge = (fiscalReceipt: FiscalReceipt | null, lines = [line()]) =>
      ({
        id: 'c1',
        totalCents: 129900,
        paidAt: new Date('2026-09-15T18:00:00.000Z'),
        lines,
        fiscalReceipt,
      }) as unknown as Parameters<typeof toMemberCharge>[0];

    it('names the charge after its most expensive line', () => {
      const lines = [
        line({ id: 'a', description: 'Agua', qty: 1, unitPriceCents: 2500 }),
        line({
          id: 'b',
          description: 'Proteína Whey',
          qty: 1,
          unitPriceCents: 119900,
        }),
        line({
          id: 'c',
          description: 'Envío a domicilio',
          qty: 1,
          unitPriceCents: 9900,
        }),
      ];
      expect(toMemberCharge(charge(receipt('open'), lines))).toMatchObject({
        description: 'Proteína Whey y 2 más',
        total: 1299,
        paidAt: '2026-09-15T18:00:00.000Z',
      });
    });

    it('a charge still in the queue can be invoiced — the receipt is created on the spot', () => {
      expect(toMemberCharge(charge(receipt('pending'))).invoice.status).toBe(
        'available',
      );
      expect(toMemberCharge(charge(receipt('failed'))).invoice.status).toBe(
        'available',
      );
    });

    it('carries the invoice of one already invoiced', () => {
      expect(
        toMemberCharge(charge(receipt('invoiced_to_customer', 'cfdi-1')))
          .invoice,
      ).toEqual({
        status: 'invoiced',
        cfdiId: 'cfdi-1',
      });
    });

    it('one that went into the global invoice is closed', () => {
      expect(
        toMemberCharge(charge(receipt('invoiced_globally'))).invoice.status,
      ).toBe('closed');
    });

    it('one from before invoicing existed has nothing to invoice', () => {
      expect(toMemberCharge(charge(null)).invoice).toEqual({
        status: 'unavailable',
        cfdiId: null,
      });
    });
  });
});
