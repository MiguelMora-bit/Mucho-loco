import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type {
  AccessCheckResult,
  BranchInventoryLevel,
  CashRegisterShift,
  CounterSale,
  GlobalInventoryItem,
  InventoryTransfer,
  MembershipPayment,
  ShiftTransaction,
} from '@mucho-loco/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import type { IdTokenClaims } from '../src/auth/cognito';

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
    await prisma.counterSaleItem.deleteMany();
    await prisma.counterSale.deleteMany();
    await prisma.inventoryTransfer.deleteMany();
    await prisma.membershipPayment.deleteMany();
    await prisma.cashRegisterShift.deleteMany();
    // Los socios dados de alta en mostrador durante estos tests no tienen
    // cognitoSub, así que borrarlos no toca a ningún usuario de la app.
    await prisma.membership.deleteMany({ where: { user: { cognitoSub: null } } });
    await prisma.user.deleteMany({ where: { cognitoSub: null } });

    await prisma.branchInventory.deleteMany();
    await prisma.branchInventory.createMany({ data: SEEDED_INVENTORY });
  }

  afterAll(async () => {
    await resetOperationalState();
    await app.close();
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
    it('rejects a sale that tries to smuggle its own total', async () => {
      await request(app.getHttpServer())
        .post('/branches/1/counter-sales')
        .set(...auth('staff'))
        .send({ picks: [{ productId: 'p9', qty: 1 }], paymentMethod: 'cash', total: 1 })
        .expect(400);
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
          tierKey: 'all',
          periodKey: 'monthly',
          paymentMethod: 'cash',
        })
        .expect(201);
      signedUp = body<MembershipPayment>(res);

      // Roma Sur cuesta 1090, tier all x1.5, mensual x1 → 1640 (redondeo a decena).
      expect(signedUp).toMatchObject({ branchId: 1, isNewMember: true, amount: 1640 });
      expect(signedUp.qrCode).toMatch(/^ML-QR-[0-9A-F]{12}$/);

      const created = await prisma.user.findFirstOrThrow({
        where: { name: 'Socio De Mostrador' },
      });
      expect(created.cognitoSub).toBeNull();
      expect(created.email).toBeNull();
    });

    it('charges a different branch a different price for the same plan', async () => {
      const res = await request(app.getHttpServer())
        .post('/branches/5/memberships/signup')
        .set(...auth('staff'))
        .send({
          memberName: 'Socio Santa Fe',
          phone: '55 3333 4444',
          tierKey: 'all',
          periodKey: 'monthly',
          paymentMethod: 'card',
        })
        .expect(201);

      // Santa Fe cuesta 1390, no 1090 — el mock cobraba precio de Roma Sur en
      // las 15 sucursales.
      expect(body<MembershipPayment>(res).amount).toBe(2090);
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
        .get(`/branches/1/member-access?qrCode=${signedUp.qrCode}`)
        .set(...auth('staff'))
        .expect(200);
      const result = body<AccessCheckResult>(res);

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
        .get(`/branches/3/member-access?qrCode=${qrCode}`)
        .set(...auth('staff'))
        .expect(200);
      expect(body<AccessCheckResult>(atHome).outcome).toBe('valid');

      const elsewhere = await request(app.getHttpServer())
        .get(`/branches/1/member-access?qrCode=${qrCode}`)
        .set(...auth('staff'))
        .expect(200);
      expect(body<AccessCheckResult>(elsewhere).outcome).toBe('wrong_branch');
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
        .get('/branches/1/member-access?fingerprintId=fp-e2e-1')
        .set(...auth('staff'))
        .expect(200);
      const result = body<AccessCheckResult>(res);

      expect(result.outcome).toBe('valid');
      expect(result.outcome === 'valid' && result.record.memberName).toBe('Socio Con Huella');
    });

    it('reports ambiguity when a name search matches more than one member', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/member-access?name=Socio')
        .set(...auth('staff'))
        .expect(200);
      const result = body<AccessCheckResult>(res);

      expect(result.outcome).toBe('ambiguous');
      expect(result.outcome === 'ambiguous' && result.candidates.length).toBeGreaterThan(1);
    });

    it('resolves a name search that matches exactly one member', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/member-access?name=Con Huella')
        .set(...auth('staff'))
        .expect(200);

      expect(body<AccessCheckResult>(res).outcome).toBe('valid');
    });

    it('returns not_found for a code nobody has', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/1/member-access?qrCode=ML-QR-NOEXISTE')
        .set(...auth('staff'))
        .expect(200);

      expect(body<AccessCheckResult>(res).outcome).toBe('not_found');
    });

    it('rejects a lookup that gives two methods at once', async () => {
      await request(app.getHttpServer())
        .get('/branches/1/member-access?qrCode=x&name=y')
        .set(...auth('staff'))
        .expect(400);
    });

    it('renewing moves the member to the new tier and branch', async () => {
      await request(app.getHttpServer())
        .post('/branches/3/memberships/renew')
        .set(...auth('staff'))
        .send({ qrCode: signedUp.qrCode, tierKey: 'single', periodKey: 'quarterly', paymentMethod: 'transfer' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/branches/3/member-access?qrCode=${signedUp.qrCode}`)
        .set(...auth('staff'))
        .expect(200);
      const result = body<AccessCheckResult>(res);

      expect(result.outcome).toBe('valid');
      expect(result.outcome === 'valid' && result.record.homeBranchId).toBe(3);
      expect(result.outcome === 'valid' && result.record.tierKey).toBe('single');
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

    it('only a manager can close the shift', async () => {
      await request(app.getHttpServer())
        .post(`/cash-register/shifts/${shift.id}/close`)
        .set(...auth('staff'))
        .expect(403);

      const res = await request(app.getHttpServer())
        .post(`/cash-register/shifts/${shift.id}/close`)
        .set(...auth('manager'))
        .expect(201);

      expect(body<CashRegisterShift>(res).status).toBe('closed');
    });

    it('refuses to close the same shift twice', async () => {
      await request(app.getHttpServer())
        .post(`/cash-register/shifts/${shift.id}/close`)
        .set(...auth('manager'))
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
});
