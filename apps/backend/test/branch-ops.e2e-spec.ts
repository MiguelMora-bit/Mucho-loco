import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type {
  AccessAlert,
  CheckInResult,
  BranchInventoryLevel,
  CashRegisterShift,
  CashShiftAudit,
  CounterSale,
  GlobalInventoryItem,
  BranchSalesReport,
  BranchStatsSummary,
  InventoryTransfer,
  MembershipInfo,
  MembershipPayment,
  MemberAccessRecord,
  AttendanceEntry,
  AttendanceSummary,
  Employee,
  Expense,
  Order,
  PayrollPeriod,
  Payslip,
  PickupOrder,
  ShiftTransaction,
  ShipmentOrder,
  Visit,
} from '@mucho-loco/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import type { IdTokenClaims } from '../src/auth/cognito';
import { nextPeriodRange } from '../src/payroll/payroll-periods';
import { mexicoDay } from '../src/memberships/visit-stats';

/**
 * E2E de la operación de sucursal y HQ contra Postgres real.
 *
 * Token falso con forma "<rol>:<email>" — a diferencia de app.e2e-spec.ts
 * (donde todos los usuarios son socios sin grupo), aquí el rol es lo que se
 * está probando: mostrador no debe poder leer el inventario de la cadena ni
 * mover stock entre sucursales.
 */
function auth(role: '' | 'staff' | 'manager' | 'owner', email = `${role || 'cliente'}@mucholoco.mx`): [string, string] {
  return ['Authorization', `Bearer ${role}:${email}`];
}

function body<T>(res: Response): T {
  return res.body as T;
}

/** Mismas cantidades que prisma/seed.ts — la referencia contra la que estos tests afirman. */
const SEEDED_INVENTORY = [
  { branchId: 1, productId: 'p1', qty: 30 },
  { branchId: 1, productId: 'p7', qty: 50 },
  { branchId: 1, productId: 'p9', qty: 200 },
  { branchId: 1, productId: 'p11', qty: 0 },
  { branchId: 1, productId: 'p13', qty: 25 },
  { branchId: 1, productId: 'p18', qty: 120 },
  { branchId: 2, productId: 'p1', qty: 20 },
  { branchId: 2, productId: 'p7', qty: 40 },
  { branchId: 2, productId: 'p9', qty: 150 },
  { branchId: 2, productId: 'p18', qty: 80 },
  { branchId: 3, productId: 'p7', qty: 26 },
  { branchId: 3, productId: 'p9', qty: 112 },
  { branchId: 3, productId: 'p18', qty: 60 },
  { branchId: 5, productId: 'p1', qty: 20 },
  { branchId: 5, productId: 'p7', qty: 40 },
  { branchId: 5, productId: 'p9', qty: 150 },
  { branchId: 5, productId: 'p18', qty: 80 },
];

describe('Branch ops + HQ (e2e, Postgres real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await resetOperationalState();
  });

  // Los tests de abajo venden y transfieren stock, así que dejan la base
  // distinta a como la encontraron. Reponer el estado ANTES (no solo después)
  // hace que la suite dé el mismo resultado corra las veces que corra, incluso
  // si una corrida anterior se cayó a la mitad y no alcanzó a limpiar.
  async function resetOperationalState(): Promise<void> {
    // Primero: un cobro no deja borrar la venta, el pago o el pedido que lo originó.
    await prisma.charge.deleteMany();
    await prisma.counterSaleItem.deleteMany();
    await prisma.counterSale.deleteMany();
    await prisma.inventoryTransfer.deleteMany();
    await prisma.membershipPayment.deleteMany();
    await prisma.cashRegisterShift.deleteMany();
    // Los socios dados de alta en mostrador durante estos tests no tienen
    // cognitoSub, así que borrarlos no toca a ningún usuario de la app.
    // Spec 012: las entradas registradas en mostrador (el seed no crea visitas).
    await prisma.accessAlert.deleteMany();
    await prisma.visit.deleteMany();
    await prisma.membership.deleteMany({ where: { user: { cognitoSub: null } } });
    await prisma.membership.deleteMany({ where: { user: { email: { startsWith: 'checkin-e2e' } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'checkin-e2e' } } });
    await prisma.user.deleteMany({ where: { cognitoSub: null } });
    await prisma.orderItem.deleteMany({ where: { order: { user: { email: { startsWith: 'pickup-e2e' } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { startsWith: 'pickup-e2e' } } } });
    await prisma.membership.deleteMany({ where: { user: { email: { startsWith: 'pickup-e2e' } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'pickup-e2e' } } });
    await prisma.orderItem.deleteMany({ where: { order: { user: { email: { startsWith: 'shipment-e2e' } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { startsWith: 'shipment-e2e' } } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'shipment-e2e' } } });
    await prisma.payslip.deleteMany();
    await prisma.attendanceEntry.deleteMany();
    await prisma.payrollPeriod.updateMany({ where: { id: 'period-2' }, data: { status: 'open' } });
    // Las quincenas creadas por los tests (las del seed tienen id fijo).
    await prisma.payrollPeriod.deleteMany({ where: { id: { notIn: ['period-1', 'period-2'] } } });
    await prisma.expense.deleteMany({ where: { description: { startsWith: 'E2E' } } });

    await prisma.branchInventory.deleteMany();
    await prisma.branchInventory.createMany({ data: SEEDED_INVENTORY });
  }

  afterAll(async () => {
    // En finally: si la limpieza truena, la app igual se cierra (si no, Jest
    // se queda esperando conexiones abiertas para siempre).
    try {
      await resetOperationalState();
    } finally {
      await app.close();
    }
  });

  describe('roles', () => {
    it('rejects the chain-wide inventory for a counter employee, allows it for the owner', async () => {
      await request(app.getHttpServer()).get('/inventory').set(...auth('staff')).expect(403);
      await request(app.getHttpServer()).get('/inventory').set(...auth('owner')).expect(200);
    });

    // Un socio de la app tiene token válido y CERO grupos — no debe poder
    // asomarse a la operación interna solo por estar autenticado.
    it('rejects a plain customer even though the token is valid', async () => {
      await request(app.getHttpServer()).get('/branches/1/inventory').set(...auth('')).expect(403);
    });

    it('still rejects an unauthenticated request with 401, not 403', async () => {
      await request(app.getHttpServer()).get('/branches/1/inventory').expect(401);
    });

    // El dueño puede hacer lo de un gerente y lo de mostrador — la jerarquía
    // evita listar los 3 grupos en cada endpoint de sucursal.
    it('lets the owner use a staff-level route', async () => {
      await request(app.getHttpServer()).get('/branches/1/inventory').set(...auth('owner')).expect(200);
    });
  });

  describe('GET /branches/:id/inventory', () => {
    it('returns the seeded levels of that branch with names from the catalog', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/inventory')
        .set(...auth('staff'))
        .expect(200);
      const levels = body<BranchInventoryLevel[]>(res);

      expect(levels.length).toBeGreaterThan(0);
      expect(levels.every((l) => l.branchId === 1)).toBe(true);
      const whey = levels.find((l) => l.productId === 'p1');
      expect(whey).toMatchObject({ productName: 'Whey Protein 5LBS · Strawberry', unitPrice: 1290 });
    });

    it('translates the product name with ?lang=en', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/inventory?lang=en')
        .set(...auth('staff'))
        .expect(200);
      const pre = body<BranchInventoryLevel[]>(res).find((l) => l.productId === 'p7');

      expect(pre?.productName).toBe('Beast Pre-Workout · Mango Chamoy');
    });
  });

  describe('GET /inventory/global', () => {
    it('consolidates the same product across every branch', async () => {
      const res = await request(app.getHttpServer())
        .get('/inventory/global')
        .set(...auth('owner'))
        .expect(200);
      const global = body<GlobalInventoryItem[]>(res);

      const shaker = global.find((i) => i.productId === 'p18');
      // Seed: 120 (Roma Sur) + 80 (Roma Norte) + 60 (Condesa) + 80 (Santa Fe).
      expect(shaker?.totalQty).toBe(340);
      // Una fila por producto, nunca una por sucursal.
      expect(new Set(global.map((i) => i.productId)).size).toBe(global.length);
    });
  });

  describe('POST /branches/:id/counter-sales', () => {
    it('prices the sale server-side and decrements only that branch stock', async () => {
      const before = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 1, productId: 'p9' } },
      });
      const otherBranchBefore = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 2, productId: 'p9' } },
      });

      const res = await request(app.getHttpServer())
        .post('/branches/1/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p9', qty: 4 }], paymentMethod: 'cash' })
        .expect(201);
      const sale = body<CounterSale>(res);

      expect(sale.total).toBe(45 * 4);
      expect(sale.items[0].unitPrice).toBe(45);

      const after = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 1, productId: 'p9' } },
      });
      const otherBranchAfter = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 2, productId: 'p9' } },
      });
      expect(after.qty).toBe(before.qty - 4);
      expect(otherBranchAfter.qty).toBe(otherBranchBefore.qty);
    });

    // El cajero no pone el precio. ValidationPipe rechaza el campo extra en
    // vez de ignorarlo en silencio — mismo criterio que CreateOrderDto.
    // Spec 009: el tipo de tarjeta llega al cobro; sin tipo queda `card` (04 provisional).
    it('records debit/credit in the charge, and plain card without a type', async () => {
      const debit = body<CounterSale>(
        await request(app.getHttpServer())
          .post('/branches/1/counter-sales')
          .set(...auth('staff'))
          .send({ picks: [{ productId: 'p9', qty: 1 }], paymentMethod: 'card', cardType: 'debit' })
          .expect(201),
      );
      expect(debit.cardType).toBe('debit');
      expect((await prisma.charge.findUniqueOrThrow({ where: { counterSaleId: debit.id } })).method).toBe('card_debit');

      const plain = body<CounterSale>(
        await request(app.getHttpServer())
          .post('/branches/1/counter-sales')
          .set(...auth('staff'))
          .send({ picks: [{ productId: 'p9', qty: 1 }], paymentMethod: 'card' })
          .expect(201),
      );
      expect((await prisma.charge.findUniqueOrThrow({ where: { counterSaleId: plain.id } })).method).toBe('card');

      await request(app.getHttpServer())
        .post('/branches/1/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p9', qty: 1 }], paymentMethod: 'card', cardType: 'amex' })
        .expect(400);
    });

    it('rejects a sale that tries to smuggle its own total', async () => {
      await request(app.getHttpServer())
        .post('/branches/1/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p9', qty: 1 }], paymentMethod: 'cash', total: 1 })
        .expect(400);
    });

    // El frontend mapea estos códigos a errores tipados (ProductNotFoundError,
    // InsufficientStockError). Si el backend volviera a mandar solo prosa, la
    // UI tendría que leer el mensaje para saber qué pasó.
    it('answers with a machine-readable code, not just a message', async () => {
      const outOfStock = await request(app.getHttpServer())
        .post('/branches/1/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p11', qty: 1 }], paymentMethod: 'cash' })
        .expect(400);
      expect(outOfStock.body).toMatchObject({
        code: 'INSUFFICIENT_STOCK',
        productId: 'p11',
        available: 0,
        requested: 1,
      });
      // El nombre viene en el cuerpo porque la UI lo muestra tal cual.
      expect(outOfStock.body).toHaveProperty('productName');

      const unknown = await request(app.getHttpServer())
        .post('/branches/1/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'fantasma', qty: 1 }], paymentMethod: 'cash' })
        .expect(404);
      expect(unknown.body).toMatchObject({ code: 'PRODUCT_NOT_FOUND', productId: 'fantasma' });

      const notStocked = await request(app.getHttpServer())
        .post('/branches/3/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p1', qty: 1 }], paymentMethod: 'cash' })
        .expect(404);
      expect(notStocked.body).toMatchObject({
        code: 'BRANCH_DOES_NOT_STOCK_PRODUCT',
        branchId: 3,
        productId: 'p1',
      });
    });

    it('refuses to sell more than the branch has and leaves stock untouched', async () => {
      const before = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 1, productId: 'p11' } },
      });
      expect(before.qty).toBe(0);

      await request(app.getHttpServer())
        .post('/branches/1/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p11', qty: 1 }], paymentMethod: 'cash' })
        .expect(400);

      const after = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 1, productId: 'p11' } },
      });
      expect(after.qty).toBe(0);
    });

    it('refuses a product the branch does not stock at all', async () => {
      await request(app.getHttpServer())
        .post('/branches/3/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p1', qty: 1 }], paymentMethod: 'cash' })
        .expect(404);
    });
  });

  describe('POST /inventory/transfers', () => {
    it('moves stock between branches and records the movement', async () => {
      const res = await request(app.getHttpServer())
        .post('/inventory/transfers')
        .set(...auth('owner'))
        .send({ productId: 'p18', fromBranchId: 1, toBranchId: 3, qty: 15 })
        .expect(201);
      const transfer = body<InventoryTransfer>(res);

      expect(transfer).toMatchObject({
        productId: 'p18',
        fromBranchId: 1,
        fromBranchName: 'ROMA SUR',
        toBranchId: 3,
        toBranchName: 'CONDESA',
        qty: 15,
      });

      const from = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 1, productId: 'p18' } },
      });
      const to = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 3, productId: 'p18' } },
      });
      expect(from.qty).toBe(120 - 15);
      expect(to.qty).toBe(60 + 15);

      const list = await request(app.getHttpServer())
        .get('/inventory/transfers')
        .set(...auth('owner'))
        .expect(200);
      expect(body<InventoryTransfer[]>(list).some((t) => t.id === transfer.id)).toBe(true);
    });

    // La sucursal 3 no maneja 'p1' — la transferencia le abre la fila, y esa
    // es la única forma de que un SKU nuevo llegue a una sucursal.
    it('opens a level at a branch that did not stock the product', async () => {
      const beforeMissing = await prisma.branchInventory.findUnique({
        where: { branchId_productId: { branchId: 3, productId: 'p1' } },
      });
      expect(beforeMissing).toBeNull();

      await request(app.getHttpServer())
        .post('/inventory/transfers')
        .set(...auth('owner'))
        .send({ productId: 'p1', fromBranchId: 1, toBranchId: 3, qty: 4 })
        .expect(201);

      const opened = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 3, productId: 'p1' } },
      });
      expect(opened.qty).toBe(4);
    });

    it('rejects a transfer bigger than the source stock, moving nothing', async () => {
      const before = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 2, productId: 'p1' } },
      });

      await request(app.getHttpServer())
        .post('/inventory/transfers')
        .set(...auth('owner'))
        .send({ productId: 'p1', fromBranchId: 2, toBranchId: 3, qty: 9999 })
        .expect(400);

      const after = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_productId: { branchId: 2, productId: 'p1' } },
      });
      expect(after.qty).toBe(before.qty);
    });

    it('rejects a transfer to the same branch', async () => {
      await request(app.getHttpServer())
        .post('/inventory/transfers')
        .set(...auth('owner'))
        .send({ productId: 'p18', fromBranchId: 1, toBranchId: 1, qty: 1 })
        .expect(400);
    });
  });

  describe('counter memberships', () => {
    let signedUp: MembershipPayment;

    it('signs up a walk-in member with no app account, pricing from the branch', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/1/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio De Mostrador',
          phone: '55 1111 2222',
          tierKey: 'single',
          periodKey: 'monthly',
          paymentMethod: 'cash',
        })
        .expect(201);
      signedUp = body<MembershipPayment>(res);

      // Roma Sur cuesta 1090, tier single x1, mensual x1 → 1090.
      expect(signedUp).toMatchObject({ branchId: 1, isNewMember: true, amount: 1090 });
      expect(signedUp.qrCode).toMatch(/^ML-QR-[0-9A-F]{12}$/);

      const created = await prisma.user.findFirstOrThrow({
        where: { name: 'Socio De Mostrador' },
      });
      expect(created.cognitoSub).toBeNull();
      expect(created.email).toBeNull();
    });

    it('charges a different branch a different price for the same single-gym plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/5/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Santa Fe',
          phone: '55 3333 4444',
          tierKey: 'single',
          periodKey: 'monthly',
          paymentMethod: 'card',
        })
        .expect(201);

      // Santa Fe cuesta 1390, no 1090 — el mock cobraba precio de Roma Sur en
      // las 15 sucursales.
      expect(body<MembershipPayment>(res).amount).toBe(1390);
    });

    // Regla de negocio 2026-09-15: a diferencia de `single` (arriba), `all` es
    // un precio fijo — Roma Sur y Santa Fe cobran lo mismo.
    it('charges the same fixed price for the all-gyms plan at any branch', async () => {
      const romaSur = await request(app.getHttpServer())
        .post('/branches/1/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Todas Roma Sur',
          phone: '55 9999 0000',
          tierKey: 'all',
          periodKey: 'monthly',
          paymentMethod: 'cash',
        })
        .expect(201);
      const santaFe = await request(app.getHttpServer())
        .post('/branches/5/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Todas Santa Fe',
          phone: '55 9999 0001',
          tierKey: 'all',
          periodKey: 'monthly',
          paymentMethod: 'cash',
        })
        .expect(201);

      expect(body<MembershipPayment>(romaSur).amount).toBe(1550);
      expect(body<MembershipPayment>(santaFe).amount).toBe(1550);
    });

    it('rejects a signup that tries to set its own price', async () => {
      await request(app.getHttpServer())
        .post('/branches/1/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Vivo', phone: '55', tierKey: 'all', periodKey: 'annual',
          paymentMethod: 'cash', amount: 1,
        })
        .expect(400);
    });

    it('finds the new member by their minted QR code', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/1/check-ins')
        .send({ qrCode: signedUp.qrCode })
        .set(...auth('staff'))
        .expect(200);
      const result = body<CheckInResult>(res);

      expect(result.outcome).toBe('valid');
      expect(result.outcome === 'valid' && result.record.memberName).toBe('Socio De Mostrador');
    });

    it('applies the branch-scope rule server-side for a single-gym member', async () => {
      const signup = await request(app.getHttpServer())
        .post('/branches/3/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Solo Condesa', phone: '55 5555 6666',
          tierKey: 'single', periodKey: 'monthly', paymentMethod: 'cash',
        })
        .expect(201);
      const { qrCode } = body<MembershipPayment>(signup);

      const atHome = await request(app.getHttpServer())
        .post('/branches/3/check-ins')
        .send({ qrCode })
        .set(...auth('staff'))
        .expect(200);
      expect(body<CheckInResult>(atHome).outcome).toBe('valid');

      const elsewhere = await request(app.getHttpServer())
        .post('/branches/1/check-ins')
        .send({ qrCode })
        .set(...auth('staff'))
        .expect(200);
      expect(body<CheckInResult>(elsewhere).outcome).toBe('wrong_branch');

      // Spec 012: solo la entrada permitida queda registrada, en su sucursal.
      const { userId } = await prisma.membership.findUniqueOrThrow({ where: { accessCode: qrCode } });
      const visits = await prisma.visit.findMany({ where: { userId } });
      expect(visits.map((v) => v.branchId)).toEqual([3]);
    });

    it('finds a member by fingerprint when they signed up without the app', async () => {
      const signup = await request(app.getHttpServer())
        .post('/branches/1/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Con Huella', phone: '55 7777 8888',
          tierKey: 'all', periodKey: 'monthly', paymentMethod: 'cash',
          fingerprintId: 'fp-e2e-1',
        })
        .expect(201);
      expect(body<MembershipPayment>(signup).isNewMember).toBe(true);

      const res = await request(app.getHttpServer())
        .post('/branches/1/check-ins')
        .send({ fingerprintId: 'fp-e2e-1' })
        .set(...auth('staff'))
        .expect(200);
      const result = body<CheckInResult>(res);

      expect(result.outcome).toBe('valid');
      expect(result.outcome === 'valid' && result.record.memberName).toBe('Socio Con Huella');
    });

    it('reports ambiguity when a name search matches more than one member', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/1/check-ins')
        .send({ name: 'Socio' })
        .set(...auth('staff'))
        .expect(200);
      const result = body<CheckInResult>(res);

      expect(result.outcome).toBe('ambiguous');
      expect(result.outcome === 'ambiguous' && result.candidates.length).toBeGreaterThan(1);
    });

    it('resolves a name search that matches exactly one member', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/1/check-ins')
        .send({ name: 'Con Huella' })
        .set(...auth('staff'))
        .expect(200);

      expect(body<CheckInResult>(res).outcome).toBe('valid');
    });

    it('returns not_found for a code nobody has', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/1/check-ins')
        .send({ qrCode: 'ML-QR-NOEXISTE' })
        .set(...auth('staff'))
        .expect(200);

      expect(body<CheckInResult>(res).outcome).toBe('not_found');
    });

    it('rejects a lookup that gives two methods at once', async () => {
      await request(app.getHttpServer())
        .post('/branches/1/check-ins')
        .send({ qrCode: 'x', name: 'y' })
        .set(...auth('staff'))
        .expect(400);
    });

    it('rejects a check-in that gives no method', async () => {
      await request(app.getHttpServer())
        .post('/branches/1/check-ins')
        .send({})
        .set(...auth('staff'))
        .expect(400);
    });

    // Spec 012: validar en mostrador ES la entrada. Una por socio por día.
    it('records one entry per member per day and tells the counter about a repeat', async () => {
      const signup = await request(app.getHttpServer())
        .post('/branches/1/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Que Entra', phone: '55 1111 2222',
          tierKey: 'all', periodKey: 'monthly', paymentMethod: 'cash',
        })
        .expect(201);
      const { qrCode } = body<MembershipPayment>(signup);
      const checkIn = async () =>
        body<CheckInResult>(
          await request(app.getHttpServer())
            .post('/branches/1/check-ins')
            .send({ qrCode })
            .set(...auth('staff'))
            .expect(200),
        );

      const first = await checkIn();
      const second = await checkIn();

      if (first.outcome !== 'valid' || second.outcome !== 'valid') throw new Error('expected valid');
      expect(first.checkIn.firstToday).toBe(true);
      expect(second.checkIn).toEqual({ visitedAt: first.checkIn.visitedAt, firstToday: false, firstBranchId: 1, firstBranch: first.checkIn.firstBranch });
      const { userId } = await prisma.membership.findUniqueOrThrow({ where: { accessCode: qrCode } });
      const visits = await prisma.visit.findMany({ where: { userId } });
      expect(visits).toHaveLength(1);
      expect(visits[0]).toMatchObject({ branchId: 1, durationMinutes: null });
    });

    // Spec 013: las cifras del inicio del panel salen de las visitas reales.
    it('derives last month, best streak and branches this month from real visits', async () => {
      const member = auth('', 'checkin-e2e-stats@mucholoco.mx');
      await request(app.getHttpServer()).get('/users/me').set(...member).expect(200);
      const user = await prisma.user.findUniqueOrThrow({ where: { email: 'checkin-e2e-stats@mucholoco.mx' } });
      await prisma.membership.create({
        data: {
          userId: user.id, branchId: 1, tierKey: 'all', periodKey: 'monthly',
          expiresAt: new Date(Date.now() + 20 * 86_400_000), accessCode: 'ML-CHECKIN-E2E-STATS',
        },
      });
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
      const shift = (day: string, days: number) => {
        const d = new Date(`${day}T00:00:00.000Z`);
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
      };
      const [year, month] = today.split('-').map(Number);
      const lastMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
      // Hoy (Roma Sur) y ayer (Condesa): racha 2. El mes pasado, 4 días seguidos: mejor racha 4.
      const days = [
        { day: today, branchId: 1 },
        { day: shift(today, -1), branchId: 3 },
        ...[10, 11, 12, 13].map((d) => ({ day: `${lastMonth}-${d}`, branchId: 1 })),
      ];
      await prisma.visit.createMany({
        data: days.map(({ day, branchId }) => ({
          userId: user.id, branchId, visitDay: new Date(`${day}T00:00:00.000Z`),
          visitedAt: new Date(`${day}T15:00:00.000Z`),
        })),
      });

      const membership = body<MembershipInfo>(
        await request(app.getHttpServer()).get('/users/me/membership').set(...member).expect(200),
      );
      // Si hoy es día 1, "ayer" cae en el mes pasado.
      const firstOfMonth = today.endsWith('-01');
      expect(membership).toMatchObject({
        streak: 2,
        bestStreak: 4,
        visits: firstOfMonth ? 1 : 2,
        visitsLastMonth: firstOfMonth ? 5 : 4,
        branchesThisMonth: firstOfMonth ? 1 : 2,
      });
    });

    // Spec 020: el mismo QR en otra sucursal el mismo día pasa, pero deja alerta.
    it('flags a same-day entry at another branch, not a return to the same one', async () => {
      const signup = await request(app.getHttpServer())
        .post('/branches/1/memberships/signup')
        .set(...auth('staff'))
        .send({ memberName: 'Socio Viajero', phone: '55 9090 9090', tierKey: 'all', periodKey: 'monthly', paymentMethod: 'cash' })
        .expect(201);
      const { qrCode } = body<MembershipPayment>(signup);
      const [romaSur, condesa] = await Promise.all([
        prisma.branch.findUniqueOrThrow({ where: { id: 1 } }),
        prisma.branch.findUniqueOrThrow({ where: { id: 3 } }),
      ]);
      const checkIn = async (branchId: number) =>
        body<CheckInResult>(
          await request(app.getHttpServer())
            .post(`/branches/${branchId}/check-ins`)
            .send({ qrCode })
            .set(...auth('staff'))
            .expect(200),
        );
      const alertsFor = async () =>
        body<AccessAlert[]>(
          await request(app.getHttpServer()).get('/access-alerts').set(...auth('owner')).expect(200),
        ).filter((a) => a.qrCode === qrCode);

      const first = await checkIn(1);
      const elsewhere = await checkIn(3);
      await checkIn(1);

      if (first.outcome !== 'valid' || elsewhere.outcome !== 'valid') throw new Error('expected valid');
      expect(first.checkIn.firstBranch).toBe(romaSur.name);
      expect(elsewhere.checkIn).toMatchObject({ firstToday: false, firstBranchId: 1, firstBranch: romaSur.name });
      const alerts = await alertsFor();
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({ memberName: 'Socio Viajero', firstBranch: romaSur.name, branch: condesa.name });
      expect(alerts[0].firstAt).toBe(first.checkIn.visitedAt);
    });

    it('keeps access alerts for HQ only', async () => {
      await request(app.getHttpServer()).get('/access-alerts').set(...auth('manager')).expect(403);
    });

    it('lets an app member see the entry, their visits and their streak', async () => {
      const member = auth('', 'checkin-e2e@mucholoco.mx');
      await request(app.getHttpServer()).get('/users/me').set(...member).expect(200);
      const user = await prisma.user.findUniqueOrThrow({ where: { email: 'checkin-e2e@mucholoco.mx' } });
      await prisma.membership.create({
        data: {
          userId: user.id, branchId: 1, tierKey: 'all', periodKey: 'monthly',
          expiresAt: new Date(Date.now() + 20 * 86_400_000), accessCode: 'ML-CHECKIN-E2E',
        },
      });

      await request(app.getHttpServer())
        .post('/branches/2/check-ins')
        .send({ qrCode: 'ML-CHECKIN-E2E' })
        .set(...auth('staff'))
        .expect(200);

      const membership = body<MembershipInfo>(
        await request(app.getHttpServer()).get('/users/me/membership').set(...member).expect(200),
      );
      expect(membership).toMatchObject({ visits: 1, streak: 1 });
      const visits = body<Visit[]>(
        await request(app.getHttpServer()).get('/users/me/visits').set(...member).expect(200),
      );
      expect(visits).toHaveLength(1);
      expect(visits[0].durationMinutes).toBeNull();
    });

    it('renewing moves the member to the new tier and branch', async () => {
      await request(app.getHttpServer())
        .post('/branches/3/memberships/renew')
        .set(...auth('staff'))
        .send({ qrCode: signedUp.qrCode, tierKey: 'single', periodKey: 'quarterly', paymentMethod: 'transfer' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/branches/3/check-ins')
        .send({ qrCode: signedUp.qrCode })
        .set(...auth('staff'))
        .expect(200);
      const result = body<CheckInResult>(res);

      expect(result.outcome).toBe('valid');
      expect(result.outcome === 'valid' && result.record.homeBranchId).toBe(3);
      expect(result.outcome === 'valid' && result.record.tierKey).toBe('single');
    });

    // Spec 009: crédito o débito llega al registro de cobros (forma de pago del CFDI).
    it('records the card type of a counter renewal in the charge', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/3/memberships/renew')
        .set(...auth('staff'))
        .send({ qrCode: signedUp.qrCode, tierKey: 'single', periodKey: 'monthly', paymentMethod: 'card', cardType: 'credit' })
        .expect(201);
      const payment = body<MembershipPayment>(res);
      expect(payment.cardType).toBe('credit');
      const charge = await prisma.charge.findUniqueOrThrow({ where: { membershipPaymentId: payment.id } });
      expect(charge.method).toBe('card_credit');
    });

    // Spec 006: renovar antes de tiempo ya no le quita días pagados al socio.
    it('renewing a valid membership adds the period after its current expiry', async () => {
      const before = await prisma.membership.findUniqueOrThrow({ where: { accessCode: signedUp.qrCode } });
      await request(app.getHttpServer())
        .post('/branches/3/memberships/renew')
        .set(...auth('staff'))
        .send({ qrCode: signedUp.qrCode, tierKey: 'single', periodKey: 'monthly', paymentMethod: 'cash' })
        .expect(201);
      const after = await prisma.membership.findUniqueOrThrow({ where: { accessCode: signedUp.qrCode } });

      expect(after.expiresAt.getTime()).toBe(before.expiresAt.getTime() + 30 * 86_400_000);
    });

    // Spec 006: con una suscripción viva que se renueva, Stripe ya le cobra.
    it('refuses to renew at the counter a membership that renews online, and says so up front', async () => {
      await prisma.membership.update({
        where: { accessCode: signedUp.qrCode },
        data: { stripeSubscriptionId: 'sub_e2e_counter', renewalCanceled: false },
      });
      try {
        const found = await request(app.getHttpServer())
          .get(`/members?qrCode=${signedUp.qrCode}`)
          .set(...auth('staff'))
          .expect(200);
        expect(body<MemberAccessRecord>(found).renewsOnline).toBe(true);

        const paymentsBefore = await prisma.membershipPayment.count();
        const res = await request(app.getHttpServer())
          .post('/branches/3/memberships/renew')
          .set(...auth('staff'))
          .send({ qrCode: signedUp.qrCode, tierKey: 'single', periodKey: 'monthly', paymentMethod: 'cash' })
          .expect(409);
        expect(body<{ code: string }>(res).code).toBe('MEMBER_RENEWS_ONLINE');
        expect(await prisma.membershipPayment.count()).toBe(paymentsBefore);

        // Canceló la renovación en la app: ahora sí se puede cobrar en mostrador.
        await prisma.membership.update({ where: { accessCode: signedUp.qrCode }, data: { renewalCanceled: true } });
        await request(app.getHttpServer())
          .post('/branches/3/memberships/renew')
          .set(...auth('staff'))
          .send({ qrCode: signedUp.qrCode, tierKey: 'single', periodKey: 'monthly', paymentMethod: 'cash' })
          .expect(201);
      } finally {
        await prisma.membership.update({
          where: { accessCode: signedUp.qrCode },
          data: { stripeSubscriptionId: null, renewalCanceled: false },
        });
      }
    });
  });

  describe('cash register', () => {
    let shift: CashRegisterShift;

    it('opens a shift on first read and returns the same one afterwards', async () => {
      const first = await request(app.getHttpServer())
        .get('/branches/2/cash-register/open-shift')
        .set(...auth('staff'))
        .expect(200);
      shift = body<CashRegisterShift>(first);

      const second = await request(app.getHttpServer())
        .get('/branches/2/cash-register/open-shift')
        .set(...auth('staff'))
        .expect(200);

      expect(shift.status).toBe('open');
      expect(body<CashRegisterShift>(second).id).toBe(shift.id);
    });

    // El pago del corte de caja es lo que los mocks aislados NO podían hacer:
    // la venta la registra un módulo y la membresía otro, y aquí salen juntas
    // porque viven en la misma base.
    it('shows counter sales and membership payments of that branch in one timeline', async () => {
      await request(app.getHttpServer())
        .post('/branches/2/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p18', qty: 1 }], paymentMethod: 'card' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/branches/2/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Roma Norte', phone: '55 9999 0000',
          tierKey: 'single', periodKey: 'monthly', paymentMethod: 'cash',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/cash-register/shifts/${shift.id}/transactions`)
        .set(...auth('staff'))
        .expect(200);
      const transactions = body<ShiftTransaction[]>(res);

      expect(transactions.map((t) => t.kind).sort()).toEqual(['membership', 'sale']);
      expect(transactions.find((t) => t.kind === 'sale')?.amount).toBe(290);
      expect(transactions.find((t) => t.kind === 'membership')?.amount).toBe(1090);
    });

    it('does not leak another branch transactions into the shift', async () => {
      await request(app.getHttpServer())
        .post('/branches/1/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p9', qty: 1 }], paymentMethod: 'cash' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/cash-register/shifts/${shift.id}/transactions`)
        .set(...auth('staff'))
        .expect(200);

      expect(body<ShiftTransaction[]>(res).every((t) => t.amount !== 45)).toBe(true);
    });

    // Spec 052: cerrar es arquear — sin el efectivo contado no hay corte.
    it('refuses to close without the counted cash', async () => {
      await request(app.getHttpServer())
        .post(`/cash-register/shifts/${shift.id}/close`)
        .set(...auth('manager'))
        .send({})
        .expect(400);
      await request(app.getHttpServer())
        .post(`/cash-register/shifts/${shift.id}/close`)
        .set(...auth('manager'))
        .send({ countedCash: -1 })
        .expect(400);
    });

    it('only a manager can close the shift, and the count is frozen with who closed it', async () => {
      await request(app.getHttpServer())
        .post(`/cash-register/shifts/${shift.id}/close`)
        .set(...auth('staff'))
        .send({ countedCash: 1000 })
        .expect(403);

      const res = await request(app.getHttpServer())
        .post(`/cash-register/shifts/${shift.id}/close`)
        .set(...auth('manager'))
        .send({ countedCash: 1000 })
        .expect(201);

      // El turno cobró $1,090 en efectivo (el alta) y $290 con tarjeta.
      expect(body<CashRegisterShift>(res)).toMatchObject({
        status: 'closed',
        countedCash: 1000,
        expectedCash: 1090,
        closedBy: 'MANAGER',
      });
    });

    it('refuses to close the same shift twice', async () => {
      await request(app.getHttpServer())
        .post(`/cash-register/shifts/${shift.id}/close`)
        .set(...auth('manager'))
        .send({ countedCash: 1090 })
        .expect(400);
    });

    it('HQ audits the closed shift with its shortage', async () => {
      const month = mexicoDay(new Date()).slice(0, 7);
      const res = await request(app.getHttpServer())
        .get(`/cash-register/audit?month=${month}`)
        .set(...auth('owner'))
        .expect(200);

      expect(body<CashShiftAudit[]>(res).find((s) => s.id === shift.id)).toMatchObject({
        branchId: 2,
        closedBy: 'MANAGER',
        closedByEmail: 'manager@mucholoco.mx',
        totals: { cash: 1090, card: 290, transfer: 0 },
        transactionCount: 2,
        countedCash: 1000,
        difference: -90,
      });

      const otherBranch = await request(app.getHttpServer())
        .get(`/cash-register/audit?month=${month}&branchId=1`)
        .set(...auth('owner'))
        .expect(200);
      expect(body<CashShiftAudit[]>(otherBranch).some((s) => s.id === shift.id)).toBe(false);
    });

    it('the audit is only for the owner and needs a real month', async () => {
      await request(app.getHttpServer())
        .get('/cash-register/audit?month=2026-09')
        .set(...auth('manager'))
        .expect(403);
      await request(app.getHttpServer())
        .get('/cash-register/audit?month=septiembre')
        .set(...auth('owner'))
        .expect(400);
    });

    it('a closed shift shows up in history and a fresh one opens next', async () => {
      const history = await request(app.getHttpServer())
        .get('/branches/2/cash-register/history')
        .set(...auth('manager'))
        .expect(200);
      expect(body<CashRegisterShift[]>(history).some((s) => s.id === shift.id)).toBe(true);

      const next = await request(app.getHttpServer())
        .get('/branches/2/cash-register/open-shift')
        .set(...auth('staff'))
        .expect(200);
      expect(body<CashRegisterShift>(next).id).not.toBe(shift.id);
    });

    // El corte ya cuadrado no se mueve: una venta posterior pertenece al turno
    // siguiente, no al cerrado.
    it('keeps a closed shift frozen when a later sale happens', async () => {
      const before = await request(app.getHttpServer())
        .get(`/cash-register/shifts/${shift.id}/transactions`)
        .set(...auth('staff'))
        .expect(200);

      await request(app.getHttpServer())
        .post('/branches/2/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p18', qty: 1 }], paymentMethod: 'cash' })
        .expect(201);

      const after = await request(app.getHttpServer())
        .get(`/cash-register/shifts/${shift.id}/transactions`)
        .set(...auth('staff'))
        .expect(200);

      expect(body<ShiftTransaction[]>(after)).toHaveLength(body<ShiftTransaction[]>(before).length);
    });
  });

  // El cruce que dos mocks aislados nunca pudieron hacer: el pedido lo crea el
  // socio desde la tienda (customer-app) y lo entrega mostrador (branch-app).
  // El MISMO pedido que el socio pagó en la tienda, visto desde la bodega
  // central (owner-panel, "Envíos").
  describe('shipments (tienda → bodega)', () => {
    const SHOPPER = 'shipment-e2e@mucholoco.mx';
    const ADDRESS = {
      street: 'Av. Insurgentes Sur 1234',
      neighborhood: 'Roma Sur',
      city: 'Cuauhtémoc',
      state: 'CDMX',
      postalCode: '06760',
      phone: '+525512345678',
    };
    let paidId: string;
    let unpaidId: string;
    let pickupId: string;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer :${SHOPPER}`)
        .expect(200);
      const shopper = await prisma.user.findUniqueOrThrow({ where: { email: SHOPPER } });
      const order = (status: 'ready' | 'pending_payment', delivery: 'home' | 'pickup') =>
        prisma.order.create({
          data: {
            userId: shopper.id,
            status,
            total: 389,
            paymentMethod: 'stripe',
            delivery,
            ...(delivery === 'home' ? { shippingAddress: ADDRESS } : { branchId: 1 }),
            items: { create: [{ name: 'Shaker Loco', flav: '700ml', img: '/assets/mucho-loco-logo.jpg', qty: 1 }] },
          },
        });
      // Lo que deja el webhook de Stripe al cobrar, una sesión abandonada, y
      // un pedido de recoger (ese sale por mostrador, no por bodega).
      paidId = (await order('ready', 'home')).id;
      unpaidId = (await order('pending_payment', 'home')).id;
      pickupId = (await order('ready', 'pickup')).id;
    });

    const memberOrder = async (id: string): Promise<Order | undefined> => {
      const res = await request(app.getHttpServer())
        .get('/users/me/orders')
        .set('Authorization', `Bearer :${SHOPPER}`)
        .expect(200);
      return body<Order[]>(res).find((o) => o.id === id);
    };

    // Bodega ve la dirección y el teléfono de cualquier socio de la cadena.
    it('is for the owner only', async () => {
      await request(app.getHttpServer()).get('/shipments').set(...auth('staff')).expect(403);
    });

    it('lists only paid home orders, with the address to ship to', async () => {
      const res = await request(app.getHttpServer()).get('/shipments').set(...auth('owner')).expect(200);
      const shipments = body<ShipmentOrder[]>(res);

      expect(shipments.find((s) => s.id === paidId)).toMatchObject({
        status: 'to_ship',
        customerName: 'SHIPMENT-E2E',
        address: ADDRESS,
      });
      // Sin cobrar, mandarlo sería regalarlo.
      expect(shipments.some((s) => s.id === unpaidId)).toBe(false);
      expect(shipments.some((s) => s.id === pickupId)).toBe(false);
    });

    it('ships with a tracking number, and the member sees it on its way', async () => {
      const res = await request(app.getHttpServer())
        .post(`/shipments/${paidId}/ship`)
        .set(...auth('owner'))
        .send({ trackingNumber: '1Z999AA1' })
        .expect(200);
      expect(body<ShipmentOrder>(res)).toMatchObject({ status: 'shipped', trackingNumber: '1Z999AA1' });

      expect(await memberOrder(paidId)).toMatchObject({ status: 'shipped', trackingNumber: '1Z999AA1' });
    });

    it('refuses to ship the same order twice', async () => {
      const res = await request(app.getHttpServer())
        .post(`/shipments/${paidId}/ship`)
        .set(...auth('owner'))
        .send({})
        .expect(400);
      expect(body<{ code: string }>(res).code).toBe('ORDER_ALREADY_SHIPPED');
    });

    it('marks it delivered, and the member sees it done', async () => {
      await request(app.getHttpServer())
        .post(`/shipments/${paidId}/deliver`)
        .set(...auth('owner'))
        .expect(200);

      expect((await memberOrder(paidId))?.status).toBe('done');
    });

    it('never ships an order that has not been paid', async () => {
      const res = await request(app.getHttpServer())
        .post(`/shipments/${unpaidId}/ship`)
        .set(...auth('owner'))
        .send({})
        .expect(400);
      expect(body<{ code: string }>(res).code).toBe('ORDER_NOT_PAID');
    });

    it('refuses a pickup order — that one leaves through the branch counter', async () => {
      const res = await request(app.getHttpServer())
        .post(`/shipments/${pickupId}/ship`)
        .set(...auth('owner'))
        .send({})
        .expect(400);
      expect(body<{ code: string }>(res).code).toBe('NOT_A_HOME_ORDER');
    });
  });

  describe('pickup orders (tienda → mostrador)', () => {
    const CUSTOMER = 'pickup-e2e@mucholoco.mx';
    let orderId: string;
    let branchShift: CashRegisterShift;

    // El turno se abre ANTES de entregar, como en la vida real: mostrador
    // llega, abre caja, y luego atiende. Un turno abierto después no puede
    // contener el efectivo de una entrega anterior — esa es justamente la
    // ventana que el corte respeta.
    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/cash-register/open-shift')
        .set(...auth('staff'))
        .expect(200);
      branchShift = body<CashRegisterShift>(res);

      // "Recoger en gym" sale de la sucursal de la membresía, y un socio
      // nuevo ya no nace con una: este ya pagó la suya, en Roma Sur.
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer :${CUSTOMER}`)
        .expect(200);
      const member = await prisma.user.findUniqueOrThrow({ where: { email: CUSTOMER } });
      await prisma.membership.upsert({
        where: { userId: member.id },
        create: {
          userId: member.id,
          branchId: 1,
          tierKey: 'all',
          periodKey: 'monthly',
          expiresAt: new Date(Date.now() + 30 * 86_400_000),
          accessCode: 'ML-PICKUP-E2E',
        },
        update: {},
      });
    });

    it('an order placed by a member in the store shows up in their branch queue', async () => {
      const placed = await request(app.getHttpServer())
        .post('/users/me/orders')
        .set('Authorization', `Bearer :${CUSTOMER}`)
        .send({
          items: [{ productId: 'p7', qty: 1 }],
          paymentMethod: 'cash',
          delivery: 'pickup',
          lang: 'es',
        })
        .expect(201);
      orderId = body<Order>(placed).id;

      // Su membresía es de Roma Sur (ver el beforeAll).
      const res = await request(app.getHttpServer())
        .get('/branches/1/pickup-orders')
        .set(...auth('staff'))
        .expect(200);
      const queue = body<PickupOrder[]>(res);
      const mine = queue.find((o) => o.id === orderId);

      expect(mine).toBeDefined();
      expect(mine?.status).toBe('ready');
      expect(mine?.customerName).toBe('PICKUP-E2E');
      expect(mine?.total).toBe(790);
    });

    it('marking it delivered flips it for the member too, in the same row', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pickup-orders/${orderId}/deliver`)
        .set(...auth('staff'))
        .expect(201);
      expect(body<PickupOrder>(res).status).toBe('delivered');

      const mine = await request(app.getHttpServer())
        .get('/users/me/orders')
        .set('Authorization', `Bearer :${CUSTOMER}`)
        .expect(200);
      const order = body<Order[]>(mine).find((o) => o.id === orderId);

      expect(order?.status).toBe('done');
      expect(order?.deliveredAt).toBeTruthy();

      // En efectivo, entregar es cobrar: el ingreso queda registrado, con el
      // precio que se le cotizó al hacer el pedido.
      const charge = await prisma.charge.findUniqueOrThrow({
        where: { orderId },
        include: { lines: true },
      });
      expect(charge).toMatchObject({ source: 'order', method: 'cash', totalCents: 79000, branchId: 1 });
      expect(charge.lines).toEqual([
        expect.objectContaining({ qty: 1, unitPriceCents: 79000, taxCategoryId: 'supplement' }),
      ]);
    });

    it('refuses to deliver the same order twice', async () => {
      await request(app.getHttpServer())
        .post(`/pickup-orders/${orderId}/deliver`)
        .set(...auth('staff'))
        .expect(400);
    });

    // Un checkout de Stripe abandonado también es un pedido "recoger en gym"
    // en pending_payment. Antes salía en la cola como listo y mostrador podía
    // entregarlo sin que nadie hubiera pagado.
    it('never hands over an online order whose payment never went through', async () => {
      const member = await prisma.user.findUniqueOrThrow({ where: { email: CUSTOMER } });
      const abandoned = await prisma.order.create({
        data: {
          userId: member.id,
          status: 'pending_payment',
          total: 790,
          paymentMethod: 'stripe',
          delivery: 'pickup',
          branchId: 1,
          items: { create: [{ name: 'Pre-Entreno Bestia', flav: 'Mango Chamoy', img: '/assets/prod-pre-mango.jpg', qty: 1 }] },
        },
      });

      const res = await request(app.getHttpServer())
        .get('/branches/1/pickup-orders')
        .set(...auth('staff'))
        .expect(200);
      expect(body<PickupOrder[]>(res).some((o) => o.id === abandoned.id)).toBe(false);

      const refused = await request(app.getHttpServer())
        .post(`/pickup-orders/${abandoned.id}/deliver`)
        .set(...auth('staff'))
        .expect(400);
      expect(body<{ code: string }>(refused).code).toBe('ORDER_NOT_PAID');
      expect(await prisma.charge.count({ where: { orderId: abandoned.id } })).toBe(0);
    });

    // El efectivo lo cobra mostrador al entregar, así que el corte de caja de
    // esa sucursal tiene que verlo — un pedido pagado con tarjeta en línea no.
    it('the cash it collected shows up in that branch cash-up', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cash-register/shifts/${branchShift.id}/transactions`)
        .set(...auth('staff'))
        .expect(200);
      const pickup = body<ShiftTransaction[]>(res).find((t) => t.kind === 'pickup');

      expect(pickup).toMatchObject({ amount: 790, paymentMethod: 'cash' });
    });
  });

  describe('reports', () => {
    it('a branch sales report adds counter sales, memberships and pickups', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/reports/sales?days=7')
        .set(...auth('manager'))
        .expect(200);
      const report = body<BranchSalesReport>(res);

      expect(report.branchId).toBe(1);
      expect(report.days).toBe(7);
      expect(report.totalRevenue).toBeGreaterThan(0);
      expect(report.byDay.map((d) => d.date)).toEqual([...report.byDay.map((d) => d.date)].sort());
      expect(report.topProducts.length).toBeLessThanOrEqual(5);
    });

    // El reporte y el registro de cobros no pueden contar historias distintas:
    // venta, membresía y pedido recogido de esta suite, todos por el mismo lado.
    it('a branch report adds up to exactly what the charges ledger holds for it', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/reports/sales?days=7')
        .set(...auth('manager'))
        .expect(200);
      const report = body<BranchSalesReport>(res);
      const ledger = await prisma.charge.aggregate({
        where: { branchId: 1 },
        _sum: { totalCents: true },
        _count: true,
      });
      const sources = await prisma.charge.findMany({
        where: { branchId: 1 },
        distinct: ['source'],
        select: { source: true },
      });

      expect(Math.round(report.totalRevenue * 100)).toBe(ledger._sum.totalCents);
      expect(report.transactionCount).toBe(ledger._count);
      expect(sources.map((s) => s.source).sort()).toEqual(['counter_membership', 'counter_sale', 'order']);
    });

    it('a report is not visible to counter staff', async () => {
      await request(app.getHttpServer())
        .get('/branches/1/reports/sales')
        .set(...auth('staff'))
        .expect(403);
    });

    it('owner stats list every branch, deriving revenue instead of hardcoding it', async () => {
      const res = await request(app.getHttpServer())
        .get('/stats/branches')
        .set(...auth('owner'))
        .expect(200);
      const stats = body<BranchStatsSummary[]>(res);

      // Las 15, no solo las que tuvieron movimiento.
      expect(stats).toHaveLength(15);
      expect(stats.find((s) => s.branchId === 1)?.revenue).toBeGreaterThan(0);
      expect(stats.every((s) => s.branchName.length > 0)).toBe(true);
    });

    // Spec 014: la afluencia sale de las entradas registradas en mostrador.
    it('owner stats count the check-ins of each branch, today and in the window', async () => {
      const statsOf = async (branchId: number) =>
        body<BranchStatsSummary[]>(
          await request(app.getHttpServer()).get('/stats/branches').set(...auth('owner')).expect(200),
        ).find((s) => s.branchId === branchId)!;
      const signup = await request(app.getHttpServer())
        .post('/branches/5/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Afluencia', phone: '55 3333 4444',
          tierKey: 'single', periodKey: 'monthly', paymentMethod: 'cash',
        })
        .expect(201);
      const { qrCode } = body<MembershipPayment>(signup);
      const [santaFeBefore, romaSurBefore] = [await statsOf(5), await statsOf(1)];

      // Permitida en su sucursal; negada en otra (tier single): esa no cuenta.
      for (const branchId of [5, 1]) {
        await request(app.getHttpServer())
          .post(`/branches/${branchId}/check-ins`)
          .send({ qrCode })
          .set(...auth('staff'))
          .expect(200);
      }

      const [santaFe, romaSur] = [await statsOf(5), await statsOf(1)];
      expect(santaFe.checkInsToday).toBe(santaFeBefore.checkInsToday + 1);
      expect(santaFe.checkIns).toBe(santaFeBefore.checkIns + 1);
      expect(romaSur.checkInsToday).toBe(romaSurBefore.checkInsToday);
      expect(romaSur.checkIns).toBe(romaSurBefore.checkIns);
    });

    it('owner stats are not visible to a branch manager', async () => {
      await request(app.getHttpServer())
        .get('/stats/branches')
        .set(...auth('manager'))
        .expect(403);
    });
  });

  // El otro cruce que los mocks aislados no podían hacer, y el pendiente
  // explícito de la Fase 3: la asistencia la ficha branch-app y la nómina la
  // paga owner-panel, sobre la misma base.
  describe('attendance → payroll (sucursal → HQ)', () => {
    const ANA = 'ana@mucholoco.mx';   // emp-1, gerente Roma Sur, $850/día
    const LUIS = 'luis@mucholoco.mx'; // emp-2, mostrador Roma Sur, $500/día
    let currentPeriodId: string;

    // Las quincenas del seed son de agosto 2026; los turnos que fichan estos
    // tests son de hoy. Se crea un periodo que SÍ los contiene — si no, la
    // nómina no tendría dónde contarlos y el test mediría otra cosa. Es el mes
    // completo (irregular a propósito): la siguiente tiene que volver a ser
    // del 1 al 15. El mes de CDMX, como cuenta los días `getAttendanceSummaries`
    // (spec 051) — con el UTC, correr esto de noche a fin de mes fallaba.
    beforeAll(async () => {
      const [year, month] = mexicoDay(new Date()).split('-').map(Number);
      const period = await prisma.payrollPeriod.create({
        data: {
          startDate: new Date(Date.UTC(year, month - 1, 1)),
          endDate: new Date(Date.UTC(year, month, 0)),
          totalDays: 15,
          status: 'open',
        },
      });
      currentPeriodId = period.id;
    });

    it('clocking in opens a shift, and a second clock-in is refused', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/1/attendance/clock-in')
        .set(...auth('staff'))
        .send({ staffEmail: LUIS, staffName: 'Luis Ángel Ortega' })
        .expect(201);
      expect(body<AttendanceEntry>(res).clockOut).toBeNull();

      await request(app.getHttpServer())
        .post('/branches/1/attendance/clock-in')
        .set(...auth('staff'))
        .send({ staffEmail: LUIS, staffName: 'Luis Ángel Ortega' })
        .expect(400);
    });

    it('the open shift is readable and disappears on clock-out', async () => {
      const open = await request(app.getHttpServer())
        .get(`/attendance/open?staffEmail=${encodeURIComponent(LUIS)}`)
        .set(...auth('staff'))
        .expect(200);
      expect(body<AttendanceEntry>(open).staffEmail).toBe(LUIS);

      const closed = await request(app.getHttpServer())
        .post('/attendance/clock-out')
        .set(...auth('staff'))
        .send({ staffEmail: LUIS })
        .expect(201);
      expect(body<AttendanceEntry>(closed).clockOut).not.toBeNull();

      const after = await request(app.getHttpServer())
        .get(`/attendance/open?staffEmail=${encodeURIComponent(LUIS)}`)
        .set(...auth('staff'))
        .expect(200);
      expect(after.body).toEqual({});
    });

    it('a manager sees who clocked in at their branch today', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/attendance/today')
        .set(...auth('manager'))
        .expect(200);

      expect(body<AttendanceEntry[]>(res).some((e) => e.staffEmail === LUIS)).toBe(true);
    });

    it('the team view is not open to counter staff', async () => {
      await request(app.getHttpServer())
        .get('/branches/1/attendance/today')
        .set(...auth('staff'))
        .expect(403);
    });

    // ESTE es el test que justifica la base compartida: nadie cargó un
    // AttendanceSummary — el día trabajado salió de fichar entrada y salida.
    it('payroll counts the shift that branch-app actually clocked', async () => {
      const res = await request(app.getHttpServer())
        .get('/payroll/attendance')
        .set(...auth('owner'))
        .expect(200);
      const summaries = body<AttendanceSummary[]>(res);

      const luis = summaries.find((s) => s.periodId === currentPeriodId && s.daysWorked === 1);
      expect(luis).toBeDefined();
    });

    it('running payroll pays for those days and closes the period', async () => {
      // Un segundo empleado con dos turnos el MISMO día: debe contar un día.
      await request(app.getHttpServer())
        .post('/branches/1/attendance/clock-in')
        .set(...auth('staff'))
        .send({ staffEmail: ANA, staffName: 'Ana Sofía Martínez' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/attendance/clock-out')
        .set(...auth('staff'))
        .send({ staffEmail: ANA })
        .expect(201);
      await request(app.getHttpServer())
        .post('/branches/1/attendance/clock-in')
        .set(...auth('staff'))
        .send({ staffEmail: ANA, staffName: 'Ana Sofía Martínez' })
        .expect(201);
      await request(app.getHttpServer())
        .post('/attendance/clock-out')
        .set(...auth('staff'))
        .send({ staffEmail: ANA })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/payroll/periods/${currentPeriodId}/run`)
        .set(...auth('owner'))
        .expect(201);
      const payslips = body<Payslip[]>(res);

      const ana = payslips.find((p) => p.employeeName === 'Ana Sofía Martínez');
      expect(ana).toBeDefined();
      // Dos turnos el mismo día = un día trabajado, a $850.
      expect(ana).toMatchObject({ daysWorked: 1, dailyRate: 850, grossPay: 850, branchId: 1, role: 'manager' });
      expect(ana?.netPay).toBe(850 - ana!.isrDeduction - ana!.imssDeduction);

      const periods = await request(app.getHttpServer())
        .get('/payroll/periods')
        .set(...auth('owner'))
        .expect(200);
      expect(body<PayrollPeriod[]>(periods).find((p) => p.id === currentPeriodId)?.status).toBe('closed');

      // Cerrado es final: correrla otra vez no puede recalcular recibos pagados.
      await request(app.getHttpServer())
        .post(`/payroll/periods/${currentPeriodId}/run`)
        .set(...auth('owner'))
        .expect(400);
    });

    // Spec 050: correr la nómina deja abierta la quincena siguiente, así la
    // operación nunca se detiene esperando a que alguien la capture.
    it('running payroll opens the next period', async () => {
      const res = await request(app.getHttpServer())
        .get('/payroll/periods')
        .set(...auth('owner'))
        .expect(200);
      const periods = body<PayrollPeriod[]>(res);
      const ran = periods.find((p) => p.id === currentPeriodId)!;

      const next = periods.find((p) => p.startDate > ran.endDate);
      expect(next).toMatchObject({ ...nextPeriodRange(ran.endDate), status: 'open' });
      expect(next?.startDate.endsWith('-01')).toBe(true);
    });

    it('opening another period while one is open is refused', async () => {
      const res = await request(app.getHttpServer())
        .post('/payroll/periods/next')
        .set(...auth('owner'))
        .expect(409);

      expect(body<{ code: string }>(res).code).toBe('PERIOD_ALREADY_OPEN');
    });

    it('a branch manager cannot open a period', async () => {
      await request(app.getHttpServer())
        .post('/payroll/periods/next')
        .set(...auth('manager'))
        .expect(403);
    });

    // El estado en que se queda hoy una base con la nómina detenida: todas
    // cerradas. "Abrir siguiente quincena" la destraba.
    it('with no open period, the owner opens the one after the latest', async () => {
      await prisma.payrollPeriod.updateMany({ where: { status: 'open' }, data: { status: 'closed' } });
      const latest = await prisma.payrollPeriod.findFirstOrThrow({ orderBy: { endDate: 'desc' } });

      const res = await request(app.getHttpServer())
        .post('/payroll/periods/next')
        .set(...auth('owner'))
        .expect(201);

      expect(body<PayrollPeriod>(res)).toMatchObject({
        ...nextPeriodRange(latest.endDate.toISOString().slice(0, 10)),
        status: 'open',
      });
    });

    it('payslips persist and are listed after the run', async () => {
      const res = await request(app.getHttpServer())
        .get('/payroll/payslips')
        .set(...auth('owner'))
        .expect(200);

      expect(body<Payslip[]>(res).length).toBeGreaterThan(0);
    });

    it('employees carry the email that links them to attendance', async () => {
      const res = await request(app.getHttpServer())
        .get('/payroll/employees')
        .set(...auth('owner'))
        .expect(200);
      const employees = body<Employee[]>(res);

      expect(employees.find((e) => e.email === ANA)?.role).toBe('manager');
    });

    it('payroll is closed to a branch manager', async () => {
      await request(app.getHttpServer())
        .get('/payroll/payslips')
        .set(...auth('manager'))
        .expect(403);
    });
  });

  describe('expenses', () => {
    it('logs a branch expense and lists it', async () => {
      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set(...auth('owner'))
        .send({ branchId: 1, category: 'utilities', description: 'E2E luz', amount: 1200 })
        .expect(201);
      const created = body<Expense>(res);

      expect(created).toMatchObject({ branchId: 1, category: 'utilities', amount: 1200 });
      expect(created.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const list = await request(app.getHttpServer())
        .get('/expenses')
        .set(...auth('owner'))
        .expect(200);
      expect(body<Expense[]>(list).some((e) => e.id === created.id)).toBe(true);
    });

    it('accepts a corporate expense with no branch', async () => {
      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set(...auth('owner'))
        .send({ branchId: null, category: 'marketing', description: 'E2E campaña', amount: 22000 })
        .expect(201);

      expect(body<Expense>(res).branchId).toBeNull();
    });

    it('rejects an expense with an unknown category', async () => {
      await request(app.getHttpServer())
        .post('/expenses')
        .set(...auth('owner'))
        .send({ branchId: 1, category: 'fiesta', description: 'E2E', amount: 100 })
        .expect(400);
    });

    it('is not open to a branch manager', async () => {
      await request(app.getHttpServer())
        .get('/expenses')
        .set(...auth('manager'))
        .expect(403);
    });
  });
});
