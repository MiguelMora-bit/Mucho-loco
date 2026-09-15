/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- jest.fn() sin generics: los mocks de Prisma y de Facturapi son deliberadamente `any`. */
import type { Invoice } from 'facturapi';
import type { PrismaService } from '../prisma/prisma.service';
import type { FacturapiService } from './facturapi.provider';
import {
  FiscalReceiptsService,
  MAX_ATTEMPTS,
  backoffMs,
} from './fiscal-receipts.service';

const receiptRow = (overrides: Record<string, unknown> = {}) => ({
  chargeId: 'c1',
  status: 'pending',
  attempts: 0,
  nextAttemptAt: new Date(),
  lastError: null,
  facturapiId: null,
  key: null,
  selfInvoiceUrl: null,
  expiresAt: null,
  cfdiId: null,
  ...overrides,
});

const chargeRow = (receipt = receiptRow()) => ({
  id: 'c1',
  method: 'card_debit',
  lines: [
    {
      description: 'Membresía Mensual',
      qty: 1,
      unitPriceCents: 109000,
      satProductKey: '01010101',
      satUnitKey: 'E48',
      taxRateBp: 1600,
    },
  ],
  fiscalReceipt: receipt,
});

describe('FiscalReceiptsService', () => {
  let prisma: any;
  let facturapi: any;
  let service: FiscalReceiptsService;

  beforeEach(() => {
    prisma = {
      charge: { findUnique: jest.fn() },
      fiscalReceipt: {
        findUnique: jest.fn(),
        update: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...receiptRow(), ...args.data }),
        ),
      },
      cfdi: {
        upsert: jest.fn((args: { create: Record<string, unknown> }) =>
          Promise.resolve({ id: 'cfdi-1', ...args.create }),
        ),
      },
      $queryRaw: jest.fn(),
    };
    facturapi = {
      configured: true,
      client: {
        receipts: { create: jest.fn(), retrieve: jest.fn() },
        invoices: { retrieve: jest.fn() },
      },
    };
    service = new FiscalReceiptsService(
      prisma as PrismaService,
      facturapi as FacturapiService,
    );
  });

  describe('createReceipt', () => {
    it('registers the charge in Facturapi keyed by its id, so a retry never duplicates it', async () => {
      prisma.charge.findUnique.mockResolvedValue(chargeRow());
      facturapi.client.receipts.create.mockResolvedValue({
        id: 'rcpt_1',
        key: 'ABC123',
        self_invoice_url: 'https://factura.space/mucholoco/ABC123',
        status: 'open',
        expires_at: '2026-10-05T00:00:00.000Z',
      });

      const receipt = await service.createReceipt('c1');

      expect(facturapi.client.receipts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_form: '28',
          external_id: 'c1',
          idempotency_key: 'c1',
        }),
      );
      expect(receipt).toMatchObject({
        status: 'open',
        facturapiId: 'rcpt_1',
        key: 'ABC123',
        selfInvoiceUrl: 'https://factura.space/mucholoco/ABC123',
        attempts: 1,
        lastError: null,
      });
    });

    // El cobro ya quedó registrado; que el PAC no conteste no puede perder su recibo.
    it('keeps a receipt the PAC did not take in the queue, and backs off', async () => {
      prisma.charge.findUnique.mockResolvedValue(
        chargeRow(receiptRow({ attempts: 2 })),
      );
      facturapi.client.receipts.create.mockRejectedValue(new Error('timeout'));
      const before = Date.now();

      const receipt = await service.createReceipt('c1');

      expect(receipt).toMatchObject({
        status: 'pending',
        attempts: 3,
        lastError: 'timeout',
      });
      expect(receipt!.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(
        before + backoffMs(3),
      );
    });

    it('gives up after the last attempt, for someone to look at', async () => {
      prisma.charge.findUnique.mockResolvedValue(
        chargeRow(receiptRow({ attempts: MAX_ATTEMPTS - 1 })),
      );
      facturapi.client.receipts.create.mockRejectedValue(
        new Error('422: clave de producto inválida'),
      );

      const receipt = await service.createReceipt('c1');

      expect(receipt).toMatchObject({
        status: 'failed',
        attempts: MAX_ATTEMPTS,
      });
    });

    it('does not register again a receipt that already is', async () => {
      prisma.charge.findUnique.mockResolvedValue(
        chargeRow(receiptRow({ status: 'open', facturapiId: 'rcpt_1' })),
      );

      const receipt = await service.createReceipt('c1');

      expect(receipt).toMatchObject({ status: 'open' });
      expect(facturapi.client.receipts.create).not.toHaveBeenCalled();
    });
  });

  it('backs off exponentially, up to six hours', () => {
    expect(backoffMs(1)).toBe(2 * 60_000);
    expect(backoffMs(3)).toBe(8 * 60_000);
    expect(backoffMs(20)).toBe(360 * 60_000);
  });

  it('counts only the receipts that actually got registered', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { chargeId: 'c1' },
      { chargeId: 'c2' },
    ]);
    jest
      .spyOn(service, 'createReceipt')
      .mockResolvedValueOnce(receiptRow({ status: 'open' }) as never)
      .mockResolvedValueOnce(
        receiptRow({ status: 'pending', attempts: 1 }) as never,
      );

    await expect(service.processDue()).resolves.toBe(1);
  });

  describe('webhook', () => {
    const stamped = {
      id: 'inv_9',
      uuid: 'UUID-9',
      status: 'valid',
      cancellation_status: 'none',
      total: 1090,
      customer: { tax_id: 'RAMD900101AB1', legal_name: 'DIEGO RAMIREZ' },
      date: '2026-09-15T18:00:00.000Z',
      global: null,
    };

    it('re-reads the receipt instead of trusting the event, and records the invoice it got', async () => {
      prisma.fiscalReceipt.findUnique.mockResolvedValue(
        receiptRow({ status: 'open', facturapiId: 'rcpt_1' }),
      );
      facturapi.client.receipts.retrieve.mockResolvedValue({
        id: 'rcpt_1',
        status: 'invoiced_to_customer',
        invoice: 'inv_9',
      });
      facturapi.client.invoices.retrieve.mockResolvedValue(stamped);

      await service.handleEvent({
        type: 'receipt.self_invoice_complete',
        data: { object: { id: 'rcpt_1' } },
      });

      expect(prisma.cfdi.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { facturapiId: 'inv_9' } }),
      );
      expect(prisma.fiscalReceipt.update).toHaveBeenCalledWith({
        where: { facturapiId: 'rcpt_1' },
        data: { status: 'invoiced_to_customer', cfdiId: 'cfdi-1' },
      });
    });

    it('ignores receipts that are not ours', async () => {
      prisma.fiscalReceipt.findUnique.mockResolvedValue(null);

      await service.handleEvent({
        type: 'receipt.status_updated',
        data: { object: { id: 'rcpt_x' } },
      });

      expect(facturapi.client.receipts.retrieve).not.toHaveBeenCalled();
    });

    it('does not store an invoice the SAT has not stamped', async () => {
      await expect(
        service.upsertCfdi({ ...stamped, uuid: '' } as unknown as Invoice),
      ).resolves.toBeNull();
      expect(prisma.cfdi.upsert).not.toHaveBeenCalled();
    });
  });
});
