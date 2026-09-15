/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- jest.fn() sin generics: los mocks son deliberadamente `any`. */
import { HttpException } from '@nestjs/common';
import { FacturapiError } from 'facturapi';
import type { PrismaService } from '../prisma/prisma.service';
import type { FacturapiService } from './facturapi.provider';
import type { FiscalReceiptsService } from './fiscal-receipts.service';
import { InvoicingService } from './invoicing.service';

const PROFILE = {
  userId: 'u1',
  taxId: 'RAMD900101AB1',
  legalName: 'DIEGO RAMIREZ',
  taxSystem: '605',
  zip: '06700',
  cfdiUse: 'G03',
  email: null,
  updatedAt: new Date(),
};

const receipt = (overrides: Record<string, unknown> = {}) => ({
  chargeId: 'c1',
  status: 'open',
  attempts: 1,
  facturapiId: 'rcpt_1',
  cfdiId: null,
  ...overrides,
});

const charge = (fiscalReceipt: unknown = receipt()) => ({
  id: 'c1',
  userId: 'u1',
  fiscalReceipt,
  user: { email: 'diego@mucholoco.mx' },
});

const INVOICE = {
  id: 'inv_1',
  uuid: 'UUID-1',
  status: 'valid',
  cancellation_status: 'none',
  total: 1090,
  customer: { tax_id: 'RAMD900101AB1', legal_name: 'DIEGO RAMIREZ' },
  date: '2026-09-15T18:00:00.000Z',
  global: null,
};

const CFDI_ROW = {
  id: 'cfdi-1',
  facturapiId: 'inv_1',
  uuid: 'UUID-1',
  kind: 'individual',
  status: 'valid',
  cancellationStatus: 'none',
  totalCents: 109000,
  customerTaxId: 'RAMD900101AB1',
  customerLegalName: 'DIEGO RAMIREZ',
  userId: 'u1',
  issuedAt: new Date('2026-09-15T18:00:00.000Z'),
};

/** Status HTTP + cuerpo del error, que es lo que ve el frontend. */
async function failure(
  promise: Promise<unknown>,
): Promise<Record<string, unknown>> {
  const error = await promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (e: unknown) => e,
  );
  if (!(error instanceof HttpException)) throw error;
  return { status: error.getStatus(), ...(error.getResponse() as object) };
}

describe('InvoicingService', () => {
  let prisma: any;
  let facturapi: any;
  let receipts: any;
  let service: InvoicingService;

  beforeEach(() => {
    prisma = {
      charge: { findFirst: jest.fn().mockResolvedValue(charge()) },
      fiscalProfile: { findUnique: jest.fn().mockResolvedValue(PROFILE) },
      cfdi: { findUnique: jest.fn() },
      fiscalReceipt: { findMany: jest.fn().mockResolvedValue([]) },
    };
    facturapi = {
      configured: true,
      client: {
        receipts: { invoice: jest.fn().mockResolvedValue(INVOICE) },
        invoices: { cancel: jest.fn() },
      },
    };
    receipts = {
      createReceipt: jest.fn(),
      syncReceipt: jest.fn(),
      recordInvoice: jest.fn().mockResolvedValue(CFDI_ROW),
      upsertCfdi: jest.fn(),
    };
    service = new InvoicingService(
      prisma as PrismaService,
      facturapi as FacturapiService,
      receipts as FiscalReceiptsService,
    );
  });

  describe('invoiceCharge', () => {
    it('invoices the receipt with the member fiscal data, sent to their account email', async () => {
      const cfdi = await service.invoiceCharge('u1', 'c1');

      expect(facturapi.client.receipts.invoice).toHaveBeenCalledWith('rcpt_1', {
        customer: {
          legal_name: 'DIEGO RAMIREZ',
          tax_id: 'RAMD900101AB1',
          tax_system: '605',
          address: { zip: '06700' },
          email: 'diego@mucholoco.mx',
        },
        use: 'G03',
      });
      expect(receipts.recordInvoice).toHaveBeenCalledWith('c1', INVOICE, 'u1');
      expect(cfdi).toMatchObject({
        id: 'cfdi-1',
        uuid: 'UUID-1',
        total: 1090,
        kind: 'individual',
      });
    });

    // Responder 403 confirmaría que ese cobro existe.
    it("answers someone else's charge as not found", async () => {
      prisma.charge.findFirst.mockResolvedValue(null);

      expect(await failure(service.invoiceCharge('u2', 'c1'))).toMatchObject({
        status: 404,
        code: 'CHARGE_NOT_FOUND',
      });
      expect(prisma.charge.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1', userId: 'u2' } }),
      );
    });

    it('asks for fiscal data first', async () => {
      prisma.fiscalProfile.findUnique.mockResolvedValue(null);

      expect(await failure(service.invoiceCharge('u1', 'c1'))).toMatchObject({
        status: 400,
        code: 'FISCAL_PROFILE_REQUIRED',
      });
    });

    it('creates the receipt on the spot when the member beats the worker', async () => {
      prisma.charge.findFirst.mockResolvedValue(
        charge(receipt({ status: 'pending', facturapiId: null })),
      );
      receipts.createReceipt.mockResolvedValue(receipt());

      await service.invoiceCharge('u1', 'c1');

      expect(receipts.createReceipt).toHaveBeenCalledWith('c1');
      expect(facturapi.client.receipts.invoice).toHaveBeenCalledWith(
        'rcpt_1',
        expect.anything(),
      );
    });

    it('says so when the PAC is down and the receipt could not be created', async () => {
      prisma.charge.findFirst.mockResolvedValue(
        charge(receipt({ status: 'pending', facturapiId: null })),
      );
      receipts.createReceipt.mockResolvedValue(
        receipt({ status: 'pending', facturapiId: null, attempts: 2 }),
      );

      expect(await failure(service.invoiceCharge('u1', 'c1'))).toMatchObject({
        status: 503,
        code: 'INVOICING_UNAVAILABLE',
      });
      expect(facturapi.client.receipts.invoice).not.toHaveBeenCalled();
    });

    it('refuses to invoice a charge twice, and says which invoice it has', async () => {
      prisma.charge.findFirst.mockResolvedValue(
        charge(receipt({ status: 'invoiced_to_customer', cfdiId: 'cfdi-0' })),
      );

      expect(await failure(service.invoiceCharge('u1', 'c1'))).toMatchObject({
        status: 409,
        code: 'CHARGE_ALREADY_INVOICED',
        cfdiId: 'cfdi-0',
      });
    });

    it('refuses a charge that already went into the global invoice', async () => {
      prisma.charge.findFirst.mockResolvedValue(
        charge(receipt({ status: 'invoiced_globally' })),
      );

      expect(await failure(service.invoiceCharge('u1', 'c1'))).toMatchObject({
        status: 409,
        code: 'INVOICING_WINDOW_CLOSED',
      });
    });

    it("passes the SAT's reason through when it rejects the data", async () => {
      const reason =
        'El RFC del receptor no se encuentra en la lista de RFC inscritos';
      facturapi.client.receipts.invoice.mockRejectedValue(
        new FacturapiError({ message: reason, status: 400 }),
      );
      receipts.syncReceipt.mockResolvedValue(receipt());

      expect(await failure(service.invoiceCharge('u1', 'c1'))).toMatchObject({
        status: 422,
        code: 'FISCAL_DATA_REJECTED',
        detail: reason,
      });
    });

    // El socio tiene el ticket, se autofacturó en el portal y luego picó "Facturar" en la app.
    it('blames the receipt, not the data, when it stopped being open meanwhile', async () => {
      facturapi.client.receipts.invoice.mockRejectedValue(
        new FacturapiError({ message: 'Receipt is not open', status: 400 }),
      );
      receipts.syncReceipt.mockResolvedValue(
        receipt({ status: 'invoiced_to_customer', cfdiId: 'cfdi-7' }),
      );

      expect(await failure(service.invoiceCharge('u1', 'c1'))).toMatchObject({
        status: 409,
        code: 'CHARGE_ALREADY_INVOICED',
        cfdiId: 'cfdi-7',
      });
    });

    it('reports a PAC that did not answer as a provider error', async () => {
      facturapi.client.receipts.invoice.mockRejectedValue(
        new Error('socket hang up'),
      );

      expect(await failure(service.invoiceCharge('u1', 'c1'))).toMatchObject({
        status: 502,
        code: 'INVOICING_PROVIDER_ERROR',
      });
    });

    it('is unavailable while Facturapi is not configured', async () => {
      facturapi.configured = false;

      expect(await failure(service.invoiceCharge('u1', 'c1'))).toMatchObject({
        status: 503,
        code: 'INVOICING_UNAVAILABLE',
      });
      expect(prisma.charge.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('cancelCfdi', () => {
    it('refuses to cancel twice', async () => {
      prisma.cfdi.findUnique.mockResolvedValue({
        ...CFDI_ROW,
        status: 'canceled',
      });

      expect(await failure(service.cancelCfdi('cfdi-1', '02'))).toMatchObject({
        status: 409,
        code: 'CFDI_ALREADY_CANCELED',
      });
      expect(facturapi.client.invoices.cancel).not.toHaveBeenCalled();
    });

    it('cancels with the SAT motive and re-reads the receipts it covered', async () => {
      prisma.cfdi.findUnique.mockResolvedValue(CFDI_ROW);
      facturapi.client.invoices.cancel.mockResolvedValue({
        ...INVOICE,
        status: 'canceled',
        cancellation_status: 'accepted',
      });
      receipts.upsertCfdi.mockResolvedValue({
        ...CFDI_ROW,
        status: 'canceled',
        cancellationStatus: 'accepted',
      });
      prisma.fiscalReceipt.findMany.mockResolvedValue([
        { facturapiId: 'rcpt_1' },
      ]);

      const cfdi = await service.cancelCfdi('cfdi-1', '02');

      expect(facturapi.client.invoices.cancel).toHaveBeenCalledWith('inv_1', {
        motive: '02',
      });
      expect(receipts.syncReceipt).toHaveBeenCalledWith('rcpt_1');
      expect(cfdi).toMatchObject({
        status: 'canceled',
        cancellationStatus: 'accepted',
      });
    });

    it("passes the SAT's reason through when it refuses the cancellation", async () => {
      prisma.cfdi.findUnique.mockResolvedValue(CFDI_ROW);
      facturapi.client.invoices.cancel.mockRejectedValue(
        new FacturapiError({
          message: 'El CFDI tiene documentos relacionados',
          status: 400,
        }),
      );

      expect(await failure(service.cancelCfdi('cfdi-1', '02'))).toMatchObject({
        status: 422,
        code: 'CANCELLATION_REJECTED',
        detail: 'El CFDI tiene documentos relacionados',
      });
    });
  });
});
