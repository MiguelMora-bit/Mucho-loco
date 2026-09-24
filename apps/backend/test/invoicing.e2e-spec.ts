/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- getHttpServer() y los jest.Mock sin generics son `any`, como en el resto de los e2e. */
import { Readable } from 'node:stream';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import request, { type Response } from 'supertest';
import type {
  Cfdi,
  FiscalProfile,
  InvoicingSummary,
  MemberCharge,
} from '@mucho-loco/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import type { IdTokenClaims } from '../src/auth/cognito';
import { ChargesService } from '../src/charges/charges.service';
import { FacturapiService } from '../src/invoicing/facturapi.provider';
import {
  FiscalReceiptsService,
  RECEIPTS_CRON,
} from '../src/invoicing/fiscal-receipts.service';

/**
 * Facturación de punta a punta contra Postgres real, con Facturapi
 * sobreescrito (misma costura que Stripe en payments.e2e-spec.ts):
 *
 *   cobro → su recibo en la cola → el worker lo da de alta → el socio guarda
 *   sus datos fiscales → factura → la global cierra lo que nadie facturó →
 *   HQ lista y cancela
 *
 * Los tests van en orden y comparten estado a propósito, como en
 * membership-billing.e2e-spec.ts: cada paso es consecuencia del anterior.
 *
 * Token falso "<rol>:<email>", como en branch-ops.e2e-spec.ts.
 */
const MEMBER = 'factura-e2e@mucholoco.mx';
const OTHER = 'factura-e2e-otro@mucholoco.mx';
const OWNER = 'factura-e2e-dueno@mucholoco.mx';
const STRIPE_INVOICES = [
  'in_e2e_factura_1',
  'in_e2e_factura_2',
  'in_e2e_factura_3',
];
const FACTURAPI_INVOICES = ['inv_e2e_1', 'inv_e2e_2', 'inv_e2e_global'];

function auth(email: string, role: '' | 'owner' = ''): [string, string] {
  return ['Authorization', `Bearer ${role}:${email}`];
}

function body<T>(res: Response): T {
  return res.body as T;
}

/** Superagent no junta el cuerpo de un PDF por su cuenta. */
function binary(
  res: Response,
  done: (err: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
}

/** Como lo teclearía el socio: con espacios y en minúsculas. */
const PROFILE_INPUT = {
  taxId: ' ramd900101ab1 ',
  legalName: ' diego ramírez ',
  taxSystem: '605',
  zip: '06700',
  cfdiUse: 'G03',
};

function openReceipt(id: string) {
  return {
    id,
    key: `KEY-${id}`,
    self_invoice_url: `https://factura.space/mucholoco/KEY-${id}`,
    status: 'open',
    invoice: null,
    expires_at: '2026-10-05T00:00:00.000Z',
  };
}

function stamped(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    uuid: `UUID-${id}`,
    status: 'valid',
    cancellation_status: 'none',
    total: 1090,
    customer: { tax_id: 'RAMD900101AB1', legal_name: 'DIEGO RAMÍREZ' },
    date: new Date().toISOString(),
    global: null,
    ...overrides,
  };
}

describe('Invoicing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let worker: FiscalReceiptsService;
  let memberId: string;
  const chargeIds: string[] = [];

  const facturapi = {
    configured: true,
    client: {
      receipts: { create: jest.fn(), retrieve: jest.fn(), invoice: jest.fn() },
      invoices: {
        retrieve: jest.fn(),
        cancel: jest.fn(),
        downloadPdf: jest.fn(),
        downloadXml: jest.fn(),
      },
    },
    verifyWebhook: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CognitoVerifierService)
      .useValue({
        verify: (token: string): Promise<IdTokenClaims> => {
          const [role, email] = token.split(':');
          return Promise.resolve({
            sub: `sub-${email}`,
            email,
            name: email.split('@')[0].toUpperCase(),
            groups: role ? [role] : [],
          });
        },
      })
      .overrideProvider(FacturapiService)
      .useValue(facturapi)
      .compile();

    // rawBody: el webhook verifica la firma sobre los bytes exactos.
    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    // El worker se corre a mano: el cron de cada minuto correría a media prueba.
    app.get(SchedulerRegistry).deleteCronJob(RECEIPTS_CRON);
    prisma = app.get(PrismaService);
    worker = app.get(FiscalReceiptsService);
    await cleanUp();
    // Los cobros de otras suites dejan su recibo en la cola, y el worker los
    // tomaría también. Aquí solo cuentan los de esta suite.
    await prisma.fiscalReceipt.deleteMany({
      where: { status: { in: ['pending', 'failed'] } },
    });

    // El socio nace con su primera petición autenticada (findOrCreateByCognito).
    await request(app.getHttpServer())
      .get('/users/me/fiscal-profile')
      .set(...auth(MEMBER))
      .expect(404);
    await request(app.getHttpServer())
      .get('/users/me/fiscal-profile')
      .set(...auth(OTHER))
      .expect(404);
    memberId = (
      await prisma.user.findUniqueOrThrow({ where: { email: MEMBER } })
    ).id;
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  async function cleanUp(): Promise<void> {
    // Los recibos se van con su cobro (Cascade); las facturas quedan sueltas.
    await prisma.charge.deleteMany({
      where: { stripeInvoiceId: { in: STRIPE_INVOICES } },
    });
    await prisma.cfdi.deleteMany({
      where: { facturapiId: { in: FACTURAPI_INVOICES } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [MEMBER, OTHER, OWNER] } },
    });
  }

  /** Un cobro del socio por el canal más corto: un cobro de suscripción no necesita pedido. */
  async function charge(
    stripeInvoiceId: string,
    totalCents = 109000,
  ): Promise<string> {
    const charges = app.get(ChargesService);
    await prisma.$transaction((tx) =>
      charges.recordMembership(tx, {
        source: 'membership_subscription',
        method: 'card_credit',
        paidAt: new Date(),
        userId: memberId,
        branchId: 1,
        tierKey: 'single',
        periodKey: 'monthly',
        totalCents,
        origin: { stripeInvoiceId },
      }),
    );
    const row = await prisma.charge.findUniqueOrThrow({
      where: { stripeInvoiceId },
    });
    chargeIds.push(row.id);
    return row.id;
  }

  describe('the queue to the PAC', () => {
    it('every new charge waits in the queue for its receipt', async () => {
      const id = await charge(STRIPE_INVOICES[0]);

      const receipt = await prisma.fiscalReceipt.findUniqueOrThrow({
        where: { chargeId: id },
      });
      expect(receipt).toMatchObject({
        status: 'pending',
        attempts: 0,
        facturapiId: null,
      });
    });

    it('the worker registers it in Facturapi — once', async () => {
      facturapi.client.receipts.create.mockResolvedValueOnce(
        openReceipt('rcpt_e2e_1'),
      );

      await expect(worker.processDue()).resolves.toBe(1);

      expect(facturapi.client.receipts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_form: '04',
          idempotency_key: chargeIds[0],
          items: [
            expect.objectContaining({
              quantity: 1,
              product: expect.objectContaining({
                price: 1090,
                product_key: '01010101',
                unit_key: 'E48',
                tax_included: true,
              }),
            }),
          ],
        }),
      );
      const receipt = await prisma.fiscalReceipt.findUniqueOrThrow({
        where: { chargeId: chargeIds[0] },
      });
      expect(receipt).toMatchObject({
        status: 'open',
        facturapiId: 'rcpt_e2e_1',
        key: 'KEY-rcpt_e2e_1',
      });

      // El siguiente tick ya no tiene nada que mandar.
      await expect(worker.processDue()).resolves.toBe(0);
      expect(facturapi.client.receipts.create).toHaveBeenCalledTimes(1);
    });

    it('a PAC that does not answer does not lose the receipt', async () => {
      const id = await charge(STRIPE_INVOICES[1], 15000);
      facturapi.client.receipts.create.mockRejectedValueOnce(
        new Error('connect ETIMEDOUT'),
      );

      await expect(worker.processDue()).resolves.toBe(0);

      const receipt = await prisma.fiscalReceipt.findUniqueOrThrow({
        where: { chargeId: id },
      });
      expect(receipt).toMatchObject({
        status: 'pending',
        attempts: 1,
        lastError: 'connect ETIMEDOUT',
      });
      expect(receipt.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

      // En espera: el siguiente tick no lo vuelve a intentar todavía.
      facturapi.client.receipts.create.mockClear();
      await expect(worker.processDue()).resolves.toBe(0);
      expect(facturapi.client.receipts.create).not.toHaveBeenCalled();
    });
  });

  describe('the member invoices', () => {
    it('cannot invoice without fiscal data', async () => {
      const res = await request(app.getHttpServer())
        .post(`/users/me/charges/${chargeIds[0]}/invoice`)
        .set(...auth(MEMBER))
        .expect(400);

      expect(body<{ code: string }>(res).code).toBe('FISCAL_PROFILE_REQUIRED');
    });

    it('rejects what is not an RFC or a SAT tax regime', async () => {
      await request(app.getHttpServer())
        .put('/users/me/fiscal-profile')
        .set(...auth(MEMBER))
        .send({ ...PROFILE_INPUT, taxId: '12345' })
        .expect(400);
      await request(app.getHttpServer())
        .put('/users/me/fiscal-profile')
        .set(...auth(MEMBER))
        .send({ ...PROFILE_INPUT, taxSystem: '999' })
        .expect(400);
    });

    it('saves the fiscal data the way the SAT writes it', async () => {
      const res = await request(app.getHttpServer())
        .put('/users/me/fiscal-profile')
        .set(...auth(MEMBER))
        .send(PROFILE_INPUT)
        .expect(200);

      expect(body<FiscalProfile>(res)).toEqual({
        taxId: 'RAMD900101AB1',
        legalName: 'DIEGO RAMÍREZ',
        taxSystem: '605',
        zip: '06700',
        cfdiUse: 'G03',
        email: null,
      });
      const again = await request(app.getHttpServer())
        .get('/users/me/fiscal-profile')
        .set(...auth(MEMBER))
        .expect(200);
      expect(body<FiscalProfile>(again).taxId).toBe('RAMD900101AB1');
    });

    it("cannot invoice someone else's charge", async () => {
      // El otro socio también tiene datos fiscales: lo que lo detiene es que el cobro no es suyo.
      await request(app.getHttpServer())
        .put('/users/me/fiscal-profile')
        .set(...auth(OTHER))
        .send({ ...PROFILE_INPUT, taxId: 'OTRO900101AB1' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/users/me/charges/${chargeIds[0]}/invoice`)
        .set(...auth(OTHER))
        .expect(404);

      expect(body<{ code: string }>(res).code).toBe('CHARGE_NOT_FOUND');
      expect(facturapi.client.receipts.invoice).not.toHaveBeenCalled();
    });

    it('invoices a charge with their fiscal data', async () => {
      facturapi.client.receipts.invoice.mockResolvedValueOnce(
        stamped('inv_e2e_1'),
      );

      const res = await request(app.getHttpServer())
        .post(`/users/me/charges/${chargeIds[0]}/invoice`)
        .set(...auth(MEMBER))
        .expect(201);

      expect(facturapi.client.receipts.invoice).toHaveBeenCalledWith(
        'rcpt_e2e_1',
        {
          customer: {
            legal_name: 'DIEGO RAMÍREZ',
            tax_id: 'RAMD900101AB1',
            tax_system: '605',
            address: { zip: '06700' },
            email: MEMBER,
          },
          use: 'G03',
        },
      );
      const cfdi = body<Cfdi>(res);
      expect(cfdi).toMatchObject({
        uuid: 'UUID-inv_e2e_1',
        kind: 'individual',
        status: 'valid',
        total: 1090,
      });
      const receipt = await prisma.fiscalReceipt.findUniqueOrThrow({
        where: { chargeId: chargeIds[0] },
      });
      expect(receipt).toMatchObject({
        status: 'invoiced_to_customer',
        cfdiId: cfdi.id,
      });
    });

    it('lists their charges with where each one stands — and only theirs', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/charges')
        .set(...auth(MEMBER))
        .expect(200);

      const charges = body<MemberCharge[]>(res);
      const invoiced = charges.find((c) => c.id === chargeIds[0]);
      expect(invoiced).toMatchObject({
        total: 1090,
        // El folio es con lo que el socio le escribe a soporte y HQ lo encuentra.
        invoice: { status: 'invoiced', uuid: 'UUID-inv_e2e_1' },
      });
      expect(invoiced!.description).toContain('Membresía');
      expect(charges.find((c) => c.id === chargeIds[1])!.invoice).toEqual({
        status: 'available',
        cfdiId: null,
        uuid: null,
      });

      const other = await request(app.getHttpServer())
        .get('/users/me/charges')
        .set(...auth(OTHER))
        .expect(200);
      expect(body<MemberCharge[]>(other)).toEqual([]);
    });

    it('never invoices the same charge twice', async () => {
      const res = await request(app.getHttpServer())
        .post(`/users/me/charges/${chargeIds[0]}/invoice`)
        .set(...auth(MEMBER))
        .expect(409);

      expect(body<{ code: string }>(res).code).toBe('CHARGE_ALREADY_INVOICED');
      expect(facturapi.client.receipts.invoice).toHaveBeenCalledTimes(1);
    });

    // El segundo cobro se quedó en espera cuando el PAC no contestó.
    it('creates the missing receipt on the spot when the member gets there first', async () => {
      facturapi.client.receipts.create.mockResolvedValueOnce(
        openReceipt('rcpt_e2e_2'),
      );
      facturapi.client.receipts.invoice.mockResolvedValueOnce(
        stamped('inv_e2e_2', { total: 150 }),
      );

      await request(app.getHttpServer())
        .post(`/users/me/charges/${chargeIds[1]}/invoice`)
        .set(...auth(MEMBER))
        .expect(201);

      expect(facturapi.client.receipts.create).toHaveBeenCalledWith(
        expect.objectContaining({ idempotency_key: chargeIds[1] }),
      );
      expect(facturapi.client.receipts.invoice).toHaveBeenLastCalledWith(
        'rcpt_e2e_2',
        expect.anything(),
      );
    });
  });

  describe('the Facturapi webhook', () => {
    it('rejects an event whose signature does not check out', async () => {
      facturapi.verifyWebhook.mockRejectedValueOnce(
        new Error('Invalid signature'),
      );

      await request(app.getHttpServer())
        .post('/invoicing/facturapi/webhook')
        .set('facturapi-signature', 'inventada')
        .send({
          type: 'receipt.status_updated',
          data: { object: { id: 'rcpt_e2e_1' } },
        })
        .expect(400);

      expect(facturapi.client.receipts.retrieve).not.toHaveBeenCalled();
    });

    it('the global invoice closes what nobody invoiced', async () => {
      const id = await charge(STRIPE_INVOICES[2], 25000);
      facturapi.client.receipts.create.mockResolvedValueOnce(
        openReceipt('rcpt_e2e_3'),
      );
      await worker.processDue();

      const event = {
        type: 'receipt.status_updated',
        data: { object: { id: 'rcpt_e2e_3' } },
      };
      facturapi.verifyWebhook.mockResolvedValueOnce(event);
      facturapi.client.receipts.retrieve.mockResolvedValueOnce({
        ...openReceipt('rcpt_e2e_3'),
        status: 'invoiced_globally',
        invoice: 'inv_e2e_global',
      });
      facturapi.client.invoices.retrieve.mockResolvedValueOnce(
        stamped('inv_e2e_global', {
          global: { periodicity: 'month', months: '09', year: 2026 },
          customer: {
            tax_id: 'XAXX010101000',
            legal_name: 'PUBLICO EN GENERAL',
          },
          total: 250,
        }),
      );

      await request(app.getHttpServer())
        .post('/invoicing/facturapi/webhook')
        .set('facturapi-signature', 'firma-valida')
        .send(event)
        .expect(200);

      expect(facturapi.verifyWebhook).toHaveBeenLastCalledWith(
        expect.any(Buffer),
        'firma-valida',
      );
      const receipt = await prisma.fiscalReceipt.findUniqueOrThrow({
        where: { chargeId: id },
        include: { cfdi: true },
      });
      expect(receipt.status).toBe('invoiced_globally');
      expect(receipt.cfdi).toMatchObject({
        kind: 'global',
        userId: null,
        customerTaxId: 'XAXX010101000',
      });

      const res = await request(app.getHttpServer())
        .post(`/users/me/charges/${id}/invoice`)
        .set(...auth(MEMBER))
        .expect(409);
      expect(body<{ code: string }>(res).code).toBe('INVOICING_WINDOW_CLOSED');

      // La global no es del socio: su folio no se le muestra.
      const list = await request(app.getHttpServer())
        .get('/users/me/charges')
        .set(...auth(MEMBER))
        .expect(200);
      expect(
        body<MemberCharge[]>(list).find((c) => c.id === id)!.invoice,
      ).toMatchObject({ status: 'closed', uuid: null });
    });
  });

  it('the member downloads their invoice — and only theirs', async () => {
    const cfdi = await prisma.cfdi.findUniqueOrThrow({
      where: { facturapiId: 'inv_e2e_1' },
    });
    facturapi.client.invoices.downloadPdf.mockResolvedValueOnce(
      Readable.from([Buffer.from('%PDF-1.7 factura')]),
    );

    const res = await request(app.getHttpServer())
      .get(`/users/me/invoices/${cfdi.id}/pdf`)
      .set(...auth(MEMBER))
      .buffer(true)
      .parse(binary)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('UUID-inv_e2e_1.pdf');
    expect((res.body as Buffer).toString()).toBe('%PDF-1.7 factura');
    expect(facturapi.client.invoices.downloadPdf).toHaveBeenCalledWith(
      'inv_e2e_1',
    );

    await request(app.getHttpServer())
      .get(`/users/me/invoices/${cfdi.id}/pdf`)
      .set(...auth(OTHER))
      .expect(404);
    const global = await prisma.cfdi.findUniqueOrThrow({
      where: { facturapiId: 'inv_e2e_global' },
    });
    await request(app.getHttpServer())
      .get(`/users/me/invoices/${global.id}/pdf`)
      .set(...auth(MEMBER))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/users/me/invoices/${cfdi.id}/zip`)
      .set(...auth(MEMBER))
      .expect(400);
  });

  describe('HQ', () => {
    it('only the owner sees every invoice', async () => {
      await request(app.getHttpServer())
        .get('/invoicing/cfdis')
        .set(...auth(MEMBER))
        .expect(403);

      const res = await request(app.getHttpServer())
        .get('/invoicing/cfdis')
        .set(...auth(OWNER, 'owner'))
        .expect(200);

      expect(body<Cfdi[]>(res).map((c) => c.uuid)).toEqual(
        expect.arrayContaining([
          'UUID-inv_e2e_1',
          'UUID-inv_e2e_2',
          'UUID-inv_e2e_global',
        ]),
      );
    });

    it('counts receipts by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/invoicing/summary')
        .set(...auth(OWNER, 'owner'))
        .expect(200);

      expect(body<InvoicingSummary>(res).receipts).toEqual({
        pending: 0,
        open: 0,
        invoicedToCustomer: 2,
        invoicedGlobally: 1,
        canceled: 0,
        failed: 0,
      });
    });

    it('cancels an invoice with a SAT motive, and its charge can be invoiced again', async () => {
      const cfdi = await prisma.cfdi.findUniqueOrThrow({
        where: { facturapiId: 'inv_e2e_1' },
      });
      // 01 exige la factura que la sustituye: todavía no se ofrece.
      await request(app.getHttpServer())
        .post(`/invoicing/cfdis/${cfdi.id}/cancel`)
        .set(...auth(OWNER, 'owner'))
        .send({ motive: '01' })
        .expect(400);

      facturapi.client.invoices.cancel.mockResolvedValueOnce(
        stamped('inv_e2e_1', {
          status: 'canceled',
          cancellation_status: 'accepted',
        }),
      );
      facturapi.client.receipts.retrieve.mockResolvedValueOnce(
        openReceipt('rcpt_e2e_1'),
      );

      const res = await request(app.getHttpServer())
        .post(`/invoicing/cfdis/${cfdi.id}/cancel`)
        .set(...auth(OWNER, 'owner'))
        .send({ motive: '02' })
        .expect(200);

      expect(body<Cfdi>(res)).toMatchObject({
        status: 'canceled',
        cancellationStatus: 'accepted',
      });
      expect(facturapi.client.invoices.cancel).toHaveBeenCalledWith(
        'inv_e2e_1',
        { motive: '02' },
      );
      const receipt = await prisma.fiscalReceipt.findUniqueOrThrow({
        where: { chargeId: chargeIds[0] },
      });
      expect(receipt).toMatchObject({ status: 'open', cfdiId: null });

      const again = await request(app.getHttpServer())
        .post(`/invoicing/cfdis/${cfdi.id}/cancel`)
        .set(...auth(OWNER, 'owner'))
        .send({ motive: '02' })
        .expect(409);
      expect(body<{ code: string }>(again).code).toBe('CFDI_ALREADY_CANCELED');
    });
  });
});
