import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type {
  Branch,
  MembershipInfo,
  Order,
  Product,
  UserProfile,
} from '@mucho-loco/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CognitoVerifierService } from '../src/auth/cognito-verifier.service';
import type { IdTokenClaims } from '../src/auth/cognito';

// "Bearer <email>" — el fake verifier de abajo usa el token tal cual como
// email, así cada test controla exactamente qué usuario está "logueado"
// sin necesitar un JWT real ni un Cognito User Pool vivo (ver "Infra
// destruida" en el CLAUDE.md raíz).
function fakeAuthHeader(email: string): [string, string] {
  return ['Authorization', `Bearer ${email}`];
}

// supertest tipa Response.body como `any` — este helper es el único lugar
// que hace el cast, para no repetir `as X` (ni perder no-unsafe-* del resto
// del repo) en cada assertion.
function body<T>(res: Response): T {
  return res.body as T;
}

describe('AppModule (e2e, Postgres real vía Prisma)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CognitoVerifierService)
      .useValue({
        verify: (token: string): Promise<IdTokenClaims> => {
          if (token === 'invalid') throw new Error('bad token');
          return Promise.resolve({
            sub: `sub-${token}`,
            email: token,
            name: token.split('@')[0].toUpperCase(),
            groups: [],
          });
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('health', () => {
    it('GET /health is public and returns ok', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200, { status: 'ok' });
    });
  });

  describe('auth guard', () => {
    it('rejects a protected route with no Authorization header', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('rejects a protected route when the token fails verification', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set(...fakeAuthHeader('invalid'))
        .expect(401);
    });

    it('does not require auth for public catalog routes', async () => {
      await request(app.getHttpServer()).get('/branches').expect(200);
      await request(app.getHttpServer()).get('/products').expect(200);
      await request(app.getHttpServer()).get('/membership-tiers').expect(200);
    });
  });

  describe('branches (seeded data)', () => {
    it('GET /branches returns the 15 seeded branches', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches')
        .expect(200);
      const branches = body<Branch[]>(res);
      expect(branches).toHaveLength(15);
      expect(branches[0]).toMatchObject({ id: 1, name: 'ROMA SUR' });
    });

    it('GET /branches/featured only returns branches with an active promo', async () => {
      const res = await request(app.getHttpServer())
        .get('/branches/featured')
        .expect(200);
      const branches = body<Branch[]>(res);
      expect(branches.every((b) => b.featured && b.promo)).toBe(true);
    });

    it('GET /branches/:id 404s for an unknown id', async () => {
      await request(app.getHttpServer()).get('/branches/999').expect(404);
    });
  });

  describe('products (seeded data)', () => {
    it('GET /products?cat filters by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .query({ cat: 'merch' })
        .expect(200);
      const products = body<Product[]>(res);
      expect(products.every((p) => p.cat === 'merch')).toBe(true);
    });

    it('GET /products/:id/siblings excludes the product itself', async () => {
      const res = await request(app.getHttpServer())
        .get('/products/p7/siblings')
        .expect(200);
      const siblings = body<Product[]>(res);
      expect(siblings.some((p) => p.id === 'p7')).toBe(false);
    });
  });

  describe('a new user end to end', () => {
    const email = `e2e-${Date.now()}@mucholoco.mx`;

    afterAll(async () => {
      // Limpieza — el resto de tests no depende de este usuario, pero deja
      // la DB de test como la encontró en vez de acumular filas entre corridas.
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.order.deleteMany({ where: { userId: user.id } });
        await prisma.membership.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    });

    it('auto-provisions a profile + default membership on first request', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set(...fakeAuthHeader(email))
        .expect(200);
      const profile = body<UserProfile>(res);
      expect(profile.email).toBe(email);
      expect(profile.branch).toBe('ROMA SUR');
    });

    it('starts with an active membership, tier all, ~30 days left', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/membership')
        .set(...fakeAuthHeader(email))
        .expect(200);
      const membership = body<MembershipInfo>(res);
      expect(membership.status).toBe('active');
      expect(membership.tierKey).toBe('all');
      expect(membership.daysLeft).toBeGreaterThanOrEqual(29);
    });

    it('starts with no orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/orders')
        .set(...fakeAuthHeader(email))
        .expect(200);
      expect(body<Order[]>(res)).toEqual([]);
    });

    it('creates a real order with a server-computed total, not a client-supplied one', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/orders')
        .set(...fakeAuthHeader(email))
        .send({
          items: [{ productId: 'p18', qty: 2 }],
          paymentMethod: 'card',
          delivery: 'home',
          lang: 'es',
        })
        .expect(201);

      // p18 = Shaker Loco, $290 — 2*290 + 99 envío = 679. El request no manda total.
      const order = body<Order>(res);
      expect(order.total).toBe(679);
      expect(order.items[0]).toMatchObject({ name: 'Shaker Loco', qty: 2 });

      const ordersRes = await request(app.getHttpServer())
        .get('/users/me/orders')
        .set(...fakeAuthHeader(email))
        .expect(200);
      expect(body<Order[]>(ordersRes)).toHaveLength(1);
    });

    it('rejects an order with a field the DTO does not declare (e.g. a spoofed total)', async () => {
      await request(app.getHttpServer())
        .post('/users/me/orders')
        .set(...fakeAuthHeader(email))
        .send({
          items: [{ productId: 'p18', qty: 1 }],
          paymentMethod: 'card',
          delivery: 'pickup',
          lang: 'es',
          total: 1,
        })
        .expect(400);
    });

    it('retryPayment flips a grace/expired membership back to active', async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      await prisma.membership.update({
        where: { userId: user.id },
        data: { status: 'grace', graceEndsAt: new Date() },
      });

      const res = await request(app.getHttpServer())
        .post('/users/me/membership/retry-payment')
        .set(...fakeAuthHeader(email))
        .expect(201);

      const membership = body<MembershipInfo>(res);
      expect(membership.status).toBe('active');
      expect(membership.graceEndsAt).toBeNull();
    });
  });

  describe('two different users never see each other as "me"', () => {
    it('user A cannot read user B by claiming their email in the body — identity only comes from the token', async () => {
      const emailA = `e2e-a-${Date.now()}@mucholoco.mx`;
      const emailB = `e2e-b-${Date.now()}@mucholoco.mx`;
      await request(app.getHttpServer())
        .get('/users/me')
        .set(...fakeAuthHeader(emailA))
        .expect(200);
      const resB = await request(app.getHttpServer())
        .get('/users/me')
        .set(...fakeAuthHeader(emailB))
        .expect(200);

      const profileB = body<UserProfile>(resB);
      expect(profileB.email).toBe(emailB);
      expect(profileB.email).not.toBe(emailA);

      await prisma.membership.deleteMany({
        where: { user: { email: { in: [emailA, emailB] } } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: [emailA, emailB] } },
      });
    });
  });
});
