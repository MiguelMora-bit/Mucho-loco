/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument -- getHttpServer() y los jest.Mock sin generics son `any`, como en el resto de los e2e. */
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import request, { type Response } from 'supertest';
import type { CounterSale, CounterTicket, MembershipPayment } from '@mucho-loco/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import type { IdTokenClaims } from '../src/auth/cognito';
import { FacturapiService } from '../src/invoicing/facturapi.provider';
import { FiscalReceiptsService, RECEIPTS_CRON } from '../src/invoicing/fiscal-receipts.service';

/**
 * Ticket de mostrador con clave de autofactura (spec 003), contra Postgres
 * real con Facturapi sobreescrito: cobro → ticket "en proceso" → el worker da
 * de alta el recibo → ticket con clave y portal.
 *
 * Token falso "<rol>:<email>", como en branch-ops.e2e-spec.ts.
 */
const MEMBER_NAME = 'Socio Ticket E2E';

function auth(role: '' | 'staff', email = `${role || 'cliente'}-ticket@mucholoco.mx`): [string, string] {
  return ['Authorization', `Bearer ${role}:${email}`];
}

function body<T>(res: Response): T {
  return res.body as T;
}

describe('Counter tickets (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let worker: FiscalReceiptsService;
  let sale: CounterSale;
  let payment: MembershipPayment;

  const facturapi = {
    configured: true,
    client: {
      receipts: {
        create: jest.fn((input: { idempotency_key?: string }) =>
          Promise.resolve({
            id: `rcpt_ticket_${input.idempotency_key ?? 'x'}`,
            key: `KEY-${(input.idempotency_key ?? 'x').slice(0, 8)}`,
            self_invoice_url: `https://factura.space/mucholoco/KEY-${(input.idempotency_key ?? 'x').slice(0, 8)}`,
            status: 'open',
            invoice: null,
            expires_at: '2026-10-31T00:00:00.000Z',
          }),
        ),
        retrieve: jest.fn(),
        invoice: jest.fn(),
      },
      invoices: { retrieve: jest.fn(), cancel: jest.fn(), downloadPdf: jest.fn(), downloadXml: jest.fn() },
    },
    verifyWebhook: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CognitoVerifierService)
      .useValue({
        verify: (token: string): Promise<IdTokenClaims> => {
          const [role, email] = token.split(':');
          return Promise.resolve({ sub: `sub-${email}`, email, name: 'STAFF', groups: role ? [role] : [] });
        },
      })
      .overrideProvider(FacturapiService)
      .useValue(facturapi)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    app.get(SchedulerRegistry).deleteCronJob(RECEIPTS_CRON);
    prisma = app.get(PrismaService);
    worker = app.get(FiscalReceiptsService);
    // Solo los recibos de esta suite: los de otras suites no deben salir en el worker.
    await prisma.fiscalReceipt.deleteMany({ where: { status: { in: ['pending', 'failed'] } } });
  });

  afterAll(async () => {
    // En `finally`: si la limpieza falla, la app igual se cierra y Jest no se cuelga.
    try {
      if (sale) {
        await prisma.charge.deleteMany({ where: { counterSaleId: sale.id } });
        await prisma.counterSaleItem.deleteMany({ where: { saleId: sale.id } });
        await prisma.counterSale.deleteMany({ where: { id: sale.id } });
        await prisma.branchInventory.update({
          where: { branchId_productId: { branchId: 1, productId: 'p9' } },
          data: { qty: { increment: 1 } },
        });
      }
      // Por nombre y no por id: también se lleva lo que dejó una corrida anterior interrumpida.
      const payments = await prisma.membershipPayment.findMany({ where: { memberName: MEMBER_NAME }, select: { id: true } });
      await prisma.charge.deleteMany({ where: { membershipPaymentId: { in: payments.map((p) => p.id) } } });
      await prisma.membershipPayment.deleteMany({ where: { memberName: MEMBER_NAME } });
      await prisma.membership.deleteMany({ where: { user: { name: MEMBER_NAME } } });
      await prisma.user.deleteMany({ where: { name: MEMBER_NAME } });
      await prisma.user.deleteMany({ where: { email: { endsWith: '-ticket@mucholoco.mx' } } });
    } finally {
      await app.close();
    }
  });

  it('a counter sale has its ticket right away, with the key still in process', async () => {
    const res = await request(app.getHttpServer())
      .post('/branches/1/counter-sales')
      .set(...auth('staff'))
      .send({ picks: [{ productId: 'p9', qty: 1 }], paymentMethod: 'cash' })
      .expect(201);
    sale = body<CounterSale>(res);

    const ticket = body<CounterTicket>(
      await request(app.getHttpServer())
        .get(`/branches/1/tickets/sale/${sale.id}`)
        .set(...auth('staff'))
        .expect(200),
    );
    expect(ticket).toMatchObject({
      kind: 'sale',
      sourceId: sale.id,
      branchName: expect.any(String),
      total: sale.total,
      method: 'cash',
      selfInvoice: { status: 'pending', key: null, url: null },
    });
    expect(ticket.lines).toEqual([expect.objectContaining({ qty: 1, unitPrice: sale.total })]);
  });

  it('once the worker registers the receipt, the ticket carries the key and portal', async () => {
    await worker.processDue();
    const ticket = body<CounterTicket>(
      await request(app.getHttpServer())
        .get(`/branches/1/tickets/sale/${sale.id}`)
        .set(...auth('staff'))
        .expect(200),
    );
    expect(ticket.selfInvoice).toEqual({
      status: 'ready',
      key: expect.stringMatching(/^KEY-/),
      url: expect.stringMatching(/^https:\/\/factura\.space\/mucholoco\/KEY-/),
      expiresAt: '2026-10-31T00:00:00.000Z',
    });
  });

  it("another branch's ticket answers like one that does not exist", async () => {
    const res = await request(app.getHttpServer())
      .get(`/branches/2/tickets/sale/${sale.id}`)
      .set(...auth('staff'))
      .expect(404);
    expect(body<{ code: string }>(res).code).toBe('TICKET_NOT_FOUND');
  });

  it('rejects an unknown kind and a member without staff role', async () => {
    await request(app.getHttpServer()).get(`/branches/1/tickets/pickup/${sale.id}`).set(...auth('staff')).expect(400);
    await request(app.getHttpServer()).get(`/branches/1/tickets/sale/${sale.id}`).set(...auth('')).expect(403);
  });

  it('a membership paid at the counter has its ticket too', async () => {
    const res = await request(app.getHttpServer())
      .post('/branches/1/memberships/signup')
      .set(...auth('staff'))
      .send({ memberName: MEMBER_NAME, phone: '55 9999 0000', tierKey: 'single', periodKey: 'monthly', paymentMethod: 'card' })
      .expect(201);
    payment = body<MembershipPayment>(res);

    const ticket = body<CounterTicket>(
      await request(app.getHttpServer())
        .get(`/branches/1/tickets/membership/${payment.id}`)
        .set(...auth('staff'))
        .expect(200),
    );
    expect(ticket).toMatchObject({ kind: 'membership', total: payment.amount, method: 'card' });
  });
});
