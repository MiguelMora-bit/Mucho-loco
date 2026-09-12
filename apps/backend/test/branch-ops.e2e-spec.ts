import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type {
  BranchInventoryLevel,
  CounterSale,
  GlobalInventoryItem,
  InventoryTransfer,
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
  });

  afterAll(async () => {
    await prisma.counterSaleItem.deleteMany();
    await prisma.counterSale.deleteMany();
    await prisma.inventoryTransfer.deleteMany();
    // Deja el stock como lo dejó el seed, para que otra corrida arranque igual.
    await prisma.branchInventory.updateMany({ where: { branchId: 1, productId: 'p9' }, data: { qty: 200 } });
    await prisma.branchInventory.updateMany({ where: { branchId: 1, productId: 'p18' }, data: { qty: 120 } });
    await prisma.branchInventory.deleteMany({ where: { branchId: 3, productId: 'p18', qty: { gt: 60 } } });
    await prisma.branchInventory.updateMany({ where: { branchId: 3, productId: 'p18' }, data: { qty: 60 } });
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

      // Limpieza: la fila no existía antes de este test.
      await prisma.branchInventory.delete({
        where: { branchId_productId: { branchId: 3, productId: 'p1' } },
      });
      await prisma.branchInventory.update({
        where: { branchId_productId: { branchId: 1, productId: 'p1' } },
        data: { qty: 30 },
      });
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
});
