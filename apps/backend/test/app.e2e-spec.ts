import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';
import type {
  Announcement,
  Branch,
  CommunityPost,
  FeedPost,
  HeatmapLevel,
  MembershipInfo,
  Order,
  PerformanceSummary,
  PersonalRecord,
  Product,
  SocialLink,
  UserProfile,
  Workout,
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
          // "correo#+52…" simula un token con phone_number (spec 015).
          const [email, phone] = token.split('#');
          return Promise.resolve({
            sub: `sub-${email}`,
            email,
            name: email.split('@')[0].toUpperCase(),
            groups: [],
            ...(phone ? { phone } : {}),
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
      await request(app.getHttpServer()).get('/announcements').expect(200);
      await request(app.getHttpServer()).get('/social/links').expect(200);
      await request(app.getHttpServer()).get('/social/feed').expect(200);
    });

    it('requires auth for /performance and /community (account content, not landing)', async () => {
      await request(app.getHttpServer()).get('/performance/summary').expect(401);
      await request(app.getHttpServer()).get('/community/posts').expect(401);
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

  describe('announcements (seeded data)', () => {
    it('GET /announcements returns the 3 seeded announcements', async () => {
      const res = await request(app.getHttpServer())
        .get('/announcements')
        .expect(200);
      const announcements = body<Announcement[]>(res);
      expect(announcements).toHaveLength(3);
      expect(announcements.find((a) => a.id === 'aniv-8')).toMatchObject({
        type: 'fiesta',
        emoji: '🎉',
      });
    });
  });

  describe('social (seeded data)', () => {
    it('GET /social/links returns the 4 seeded networks', async () => {
      const res = await request(app.getHttpServer())
        .get('/social/links')
        .expect(200);
      const links = body<SocialLink[]>(res);
      expect(links).toHaveLength(4);
      expect(links.find((l) => l.key === 'instagram')).toMatchObject({
        handle: '@mucholoco.fit',
      });
    });

    it('GET /social/feed returns the 6 seeded posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/social/feed')
        .expect(200);
      expect(body<FeedPost[]>(res)).toHaveLength(6);
    });
  });

  describe('performance (the member\'s own: workouts, attendance)', () => {
    // Spec 018: el resumen y los récords salen de lo registrado (017) y de la asistencia (012).
    it('GET /performance/summary and /records derive from the member\'s workouts and visits', async () => {
      const member = 'summary-e2e@mucholoco.mx';
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
      const [year, month] = today.split('-').map(Number);
      const lastMonth = `${new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7)}-01`;
      const lift = (date: string, weightKg: number) => ({
        date,
        name: 'Push',
        durationMinutes: null,
        exercises: [{ name: 'Press de banca', sets: [{ reps: 10, weightKg }] }],
      });
      try {
        for (const input of [lift(lastMonth, 50), lift(today, 60)]) {
          await request(app.getHttpServer())
            .post('/performance/workouts')
            .set(...fakeAuthHeader(member))
            .send(input)
            .expect(201);
        }
        const user = await prisma.user.findUniqueOrThrow({ where: { email: member } });
        await prisma.visit.create({
          data: { userId: user.id, branchId: 1, visitedAt: new Date(), visitDay: new Date(`${today}T00:00:00.000Z`) },
        });

        const summary = body<PerformanceSummary>(
          await request(app.getHttpServer()).get('/performance/summary').set(...fakeAuthHeader(member)).expect(200),
        );
        expect(summary).toEqual({
          workoutsThisMonth: 1,
          workoutsLastMonth: 1,
          volumeThisMonthKg: 600,
          volumeLastMonthKg: 500,
          streak: 1,
          bestStreak: 1,
          prsThisMonth: 1,
          prExercisesThisMonth: ['Press de banca'],
        });
        const records = body<PersonalRecord[]>(
          await request(app.getHttpServer()).get('/performance/records').set(...fakeAuthHeader(member)).expect(200),
        );
        expect(records).toEqual([{ exercise: 'Press de banca', weightKg: 60, date: today, previousKg: 50 }]);
      } finally {
        await prisma.workout.deleteMany({ where: { user: { email: member } } });
        await prisma.visit.deleteMany({ where: { user: { email: member } } });
        await prisma.user.deleteMany({ where: { email: member } });
      }
    });

    // Spec 016: el heatmap es la asistencia real del socio, no una cuadrícula sembrada.
    it('GET /performance/heatmap is the member\'s own attendance: 52 weeks x 7 days, today marked', async () => {
      const member = 'heat-e2e@mucholoco.mx';
      const other = 'heat-other-e2e@mucholoco.mx';
      try {
        await request(app.getHttpServer()).get('/users/me').set(...fakeAuthHeader(member)).expect(200);
        const user = await prisma.user.findUniqueOrThrow({ where: { email: member } });
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
        await prisma.visit.create({
          data: {
            userId: user.id, branchId: 1, visitedAt: new Date(),
            visitDay: new Date(`${today}T00:00:00.000Z`),
          },
        });

        const mine = body<HeatmapLevel[][]>(
          await request(app.getHttpServer()).get('/performance/heatmap').set(...fakeAuthHeader(member)).expect(200),
        );
        expect(mine).toHaveLength(52);
        expect(mine.every((week) => week.length === 7)).toBe(true);
        // Última columna = esta semana; filas de lunes (0) a domingo (6).
        const weekday = (new Date(`${today}T00:00:00.000Z`).getUTCDay() + 6) % 7;
        expect(mine[51][weekday]).toBe('l2');
        expect(mine.flat().filter((level) => level !== '')).toHaveLength(1);

        const theirs = body<HeatmapLevel[][]>(
          await request(app.getHttpServer()).get('/performance/heatmap').set(...fakeAuthHeader(other)).expect(200),
        );
        expect(theirs.flat().every((level) => level === '')).toBe(true);
      } finally {
        await prisma.visit.deleteMany({ where: { user: { email: { in: [member, other] } } } });
        await prisma.user.deleteMany({ where: { email: { in: [member, other] } } });
      }
    });
  });

  describe('community (real per-user CRUD, identity from token)', () => {
    const emailA = `e2e-community-a-${Date.now()}@mucholoco.mx`;
    const emailB = `e2e-community-b-${Date.now()}@mucholoco.mx`;

    afterAll(async () => {
      const users = await prisma.user.findMany({
        where: { email: { in: [emailA, emailB] } },
      });
      const userIds = users.map((u) => u.id);
      await prisma.communityComment.deleteMany({
        where: { authorId: { in: userIds } },
      });
      await prisma.communityLike.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.communityPost.deleteMany({
        where: { authorId: { in: userIds } },
      });
      await prisma.membership.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    });

    // La sucursal del autor sale de su membresía, y un socio nuevo ya no nace
    // con una: A ya pagó la suya, en Roma Sur.
    beforeAll(async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set(...fakeAuthHeader(emailA))
        .expect(200);
      const author = await prisma.user.findUniqueOrThrow({
        where: { email: emailA },
      });
      await prisma.membership.create({
        data: {
          userId: author.id,
          branchId: 1,
          tierKey: 'all',
          periodKey: 'monthly',
          expiresAt: new Date(Date.now() + 30 * 86_400_000),
          accessCode: `ML-COMMUNITY-${Date.now()}`,
        },
      });
    });

    it('creates a post with authorName/authorBranch resolved server-side from the token, not from the request body', async () => {
      const res = await request(app.getHttpServer())
        .post('/community/posts')
        .set(...fakeAuthHeader(emailA))
        .send({ body: 'primer post de prueba' })
        .expect(201);

      const post = body<CommunityPost>(res);
      expect(post.body).toBe('primer post de prueba');
      // Auto-provisión da name = email.split('@')[0].toUpperCase() — mismo
      // criterio que el fake verifier usa para `name` en este test suite.
      expect(post.authorName).toBe(emailA.split('@')[0].toUpperCase());
      expect(post.authorBranch).toBe('ROMA SUR');
      expect(post.likeCount).toBe(0);
      expect(post.likedByMe).toBe(false);
    });

    it('rejects a field the DTO does not declare (e.g. a spoofed authorName)', async () => {
      await request(app.getHttpServer())
        .post('/community/posts')
        .set(...fakeAuthHeader(emailA))
        .send({ body: 'otro post', authorName: 'Alguien Más' })
        .expect(400);
    });

    it('a second user sees the post in the feed with likedByMe: false, then toggles a like on it', async () => {
      await request(app.getHttpServer())
        .get('/users/me') // auto-provisiona a B antes de interactuar
        .set(...fakeAuthHeader(emailB))
        .expect(200);

      const feedRes = await request(app.getHttpServer())
        .get('/community/posts')
        .set(...fakeAuthHeader(emailB))
        .expect(200);
      const feed = body<CommunityPost[]>(feedRes);
      const post = feed.find((p) => p.body === 'primer post de prueba');
      expect(post?.likedByMe).toBe(false);

      const likeRes = await request(app.getHttpServer())
        .post(`/community/posts/${post!.id}/like`)
        .set(...fakeAuthHeader(emailB))
        .expect(201);
      expect(body<CommunityPost>(likeRes).likeCount).toBe(1);
      expect(body<CommunityPost>(likeRes).likedByMe).toBe(true);

      const unlikeRes = await request(app.getHttpServer())
        .post(`/community/posts/${post!.id}/like`)
        .set(...fakeAuthHeader(emailB))
        .expect(201);
      expect(body<CommunityPost>(unlikeRes).likeCount).toBe(0);
      expect(body<CommunityPost>(unlikeRes).likedByMe).toBe(false);
    });

    it('adds a comment that shows up for both users', async () => {
      const feedRes = await request(app.getHttpServer())
        .get('/community/posts')
        .set(...fakeAuthHeader(emailA))
        .expect(200);
      const post = body<CommunityPost[]>(feedRes).find(
        (p) => p.body === 'primer post de prueba',
      )!;

      const commentRes = await request(app.getHttpServer())
        .post(`/community/posts/${post.id}/comments`)
        .set(...fakeAuthHeader(emailB))
        .send({ body: 'buen post!' })
        .expect(201);

      const updated = body<CommunityPost>(commentRes);
      expect(updated.comments).toHaveLength(1);
      expect(updated.comments[0].body).toBe('buen post!');
    });

    it('404s when liking a post that does not exist', async () => {
      await request(app.getHttpServer())
        .post('/community/posts/does-not-exist/like')
        .set(...fakeAuthHeader(emailA))
        .expect(404);
    });

    it('rejects an empty comment body', async () => {
      const feedRes = await request(app.getHttpServer())
        .get('/community/posts')
        .set(...fakeAuthHeader(emailA))
        .expect(200);
      const post = body<CommunityPost[]>(feedRes).find(
        (p) => p.body === 'primer post de prueba',
      )!;

      await request(app.getHttpServer())
        .post(`/community/posts/${post.id}/comments`)
        .set(...fakeAuthHeader(emailA))
        .send({ body: '' })
        .expect(400);
    });
  });

  // El panel del móvil pide perfil, membresía, visitas y pedidos AL MISMO
  // TIEMPO. Con un socio que el backend nunca ha visto, las cuatro requests
  // compiten por crearlo: ninguna debe fallar por la carrera, y debe quedar
  // UN socio — sin membresía, que nace con su primer cobro (ver
  // findOrCreateByCognito).
  // Spec 017: el socio registra sus entrenamientos; series, volumen y récords
  // los calcula el servidor.
  describe('workouts', () => {
    const me = 'workout-e2e@mucholoco.mx';
    const other = 'workout-other-e2e@mucholoco.mx';
    const day = (offset: number) => {
      const d = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const bench = (date: string, weightKg: number) => ({
      date,
      name: 'Push Day',
      durationMinutes: 45,
      exercises: [{ name: 'Press de banca', sets: [{ reps: 8, weightKg: 60 }, { reps: 6, weightKg }] }],
    });
    const log = (email: string, input: object) =>
      request(app.getHttpServer()).post('/performance/workouts').set(...fakeAuthHeader(email)).send(input);
    const list = async (email: string) =>
      body<Workout[]>(
        await request(app.getHttpServer()).get('/performance/workouts').set(...fakeAuthHeader(email)).expect(200),
      );
    let firstId: string;

    afterAll(async () => {
      await prisma.workout.deleteMany({ where: { user: { email: { in: [me, other] } } } });
      await prisma.user.deleteMany({ where: { email: { in: [me, other] } } });
    });

    it('logs a workout and derives its sets and volume', async () => {
      const saved = body<Workout>(await log(me, bench(day(-1), 70)).expect(201));
      firstId = saved.id;
      expect(saved).toMatchObject({ name: 'Push Day', date: day(-1), durationMinutes: 45, setCount: 2, volumeKg: 900, prs: [] });
      expect(saved.exercises).toEqual(bench(day(-1), 70).exercises);
    });

    it('marks a record when the best previous weight is beaten, newest first', async () => {
      const saved = body<Workout>(await log(me, bench(day(0), 75)).expect(201));
      expect(saved.prs).toEqual([{ exercise: 'Press de banca', weightKg: 75, previousKg: 70 }]);
      expect((await list(me)).map((w) => w.date)).toEqual([day(0), day(-1)]);
    });

    it('never shows or deletes another member\'s workouts', async () => {
      expect(await list(other)).toEqual([]);
      const res = await request(app.getHttpServer())
        .delete(`/performance/workouts/${firstId}`)
        .set(...fakeAuthHeader(other))
        .expect(404);
      expect(body<{ code: string }>(res).code).toBe('WORKOUT_NOT_FOUND');
    });

    it('deletes your own workout and recomputes the records', async () => {
      await request(app.getHttpServer()).delete(`/performance/workouts/${firstId}`).set(...fakeAuthHeader(me)).expect(204);
      const [remaining] = await list(me);
      // Sin el de 70 kg, el de 75 es la línea base: ya no es récord.
      expect(remaining.prs).toEqual([]);
      expect(await list(me)).toHaveLength(1);
    });

    it('rejects a future day, a set without reps and fields the server derives', async () => {
      await log(me, bench(day(1), 80)).expect(400);
      await log(me, { ...bench(day(0), 80), exercises: [{ name: 'Press', sets: [{ reps: 0, weightKg: 60 }] }] }).expect(400);
      await log(me, { ...bench(day(0), 80), volumeKg: 1 }).expect(400);
    });
  });

  // Spec 015: quien entra con Google/Facebook no trae teléfono y sin él no
  // hay avisos de WhatsApp. El socio lo completa (o lo cambia) en su perfil.
  describe('member phone', () => {
    const email = 'phone-e2e@mucholoco.mx';

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email } });
    });

    it('lets a member without a phone add one, and returns their profile', async () => {
      const before = body<UserProfile>(
        await request(app.getHttpServer()).get('/users/me').set(...fakeAuthHeader(email)).expect(200),
      );
      expect(before.phone).toBe('');

      const saved = body<UserProfile>(
        await request(app.getHttpServer())
          .put('/users/me/phone')
          .set(...fakeAuthHeader(email))
          .send({ phone: '+525512345678' })
          .expect(200),
      );
      expect(saved).toMatchObject({ email, phone: '+525512345678' });
    });

    it('rejects a phone that is not E.164, and any other field', async () => {
      await request(app.getHttpServer())
        .put('/users/me/phone')
        .set(...fakeAuthHeader(email))
        .send({ phone: '5512' })
        .expect(400);
      await request(app.getHttpServer())
        .put('/users/me/phone')
        .set(...fakeAuthHeader(email))
        .send({ phone: '+525512345678', name: 'OTRO NOMBRE' })
        .expect(400);
    });

    it('never lets the token overwrite the phone the member saved', async () => {
      const profile = body<UserProfile>(
        await request(app.getHttpServer())
          .get('/users/me')
          .set(...fakeAuthHeader(`${email}#+525599998888`))
          .expect(200),
      );
      expect(profile.phone).toBe('+525512345678');
    });
  });

  describe('a brand-new member opening the mobile dashboard', () => {
    const email = `e2e-race-${Date.now()}@mucholoco.mx`;

    afterAll(async () => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.membership.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    });

    it('survives four parallel first requests: one member, and no membership until paying', async () => {
      const server = app.getHttpServer();
      const responses = await Promise.all(
        [
          '/users/me',
          '/users/me/membership',
          '/users/me/visits',
          '/users/me/orders',
        ].map((path) =>
          request(server)
            .get(path)
            .set(...fakeAuthHeader(email)),
        ),
      );

      // 404 en membresía = "todavía no contrata", no un error de la carrera.
      expect(responses.map((r) => r.status)).toEqual([200, 404, 200, 200]);
      expect(await prisma.user.count({ where: { email } })).toBe(1);
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(
        await prisma.membership.count({ where: { userId: user.id } }),
      ).toBe(0);
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

    it('auto-provisions a profile on first request, with no branch yet', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set(...fakeAuthHeader(email))
        .expect(200);
      const profile = body<UserProfile>(res);
      expect(profile.email).toBe(email);
      expect(profile.branch).toBe('');
    });

    // Antes nacía con una mensual de 15 sucursales regalada. La membresía
    // ahora existe desde el primer cobro: ver test/membership-billing.e2e-spec.ts.
    it('has no membership until the first payment', async () => {
      await request(app.getHttpServer())
        .get('/users/me/membership')
        .set(...fakeAuthHeader(email))
        .expect(404);
    });

    it('starts with no orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/orders')
        .set(...fakeAuthHeader(email))
        .expect(200);
      expect(body<Order[]>(res)).toEqual([]);
    });

    // Sin pasarela solo se puede pedir en efectivo y al recoger. Antes esta
    // ruta aceptaba 'card' (y transferencia, Mercado Pago, PayPal) y creaba
    // el pedido como pagado sin cobrar nada.
    it('refuses an online payment method: those go through the Stripe checkout', async () => {
      for (const paymentMethod of ['card', 'transfer', 'paypal', 'mercadopago']) {
        await request(app.getHttpServer())
          .post('/users/me/orders')
          .set(...fakeAuthHeader(email))
          .send({
            items: [{ productId: 'p18', qty: 1 }],
            paymentMethod,
            delivery: 'pickup',
            lang: 'es',
          })
          .expect(400);
      }
    });

    it('refuses a pickup order before the member has a membership to pick it up at', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/orders')
        .set(...fakeAuthHeader(email))
        .send({
          items: [{ productId: 'p18', qty: 1 }],
          paymentMethod: 'cash',
          delivery: 'pickup',
          lang: 'es',
        })
        .expect(400);
      expect(body<{ code: string }>(res).code).toBe('PICKUP_REQUIRES_MEMBERSHIP');
    });

    it('creates a cash pickup order with a server-computed total, pending until the counter collects it', async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      await prisma.membership.create({
        data: {
          userId: user.id,
          branchId: 1,
          tierKey: 'all',
          periodKey: 'monthly',
          expiresAt: new Date(Date.now() + 30 * 86_400_000),
          accessCode: `ML-E2E-${Date.now()}`,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/users/me/orders')
        .set(...fakeAuthHeader(email))
        .send({
          items: [{ productId: 'p18', qty: 2 }],
          paymentMethod: 'cash',
          delivery: 'pickup',
          lang: 'es',
        })
        .expect(201);

      // p18 = Shaker Loco, $290 — 2*290 = 580. El request no manda total.
      const order = body<Order>(res);
      expect(order.total).toBe(580);
      expect(order.status).toBe('pending_payment');
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
          paymentMethod: 'cash',
          delivery: 'pickup',
          lang: 'es',
          total: 1,
        })
        .expect(400);
    });

    // Reactivaba la membresía sin cobrar nada. El pago de verdad es
    // POST /payments/membership-invoice (factura pendiente en Stripe).
    it('no longer exposes the fake retry-payment that reactivated without charging', async () => {
      await request(app.getHttpServer())
        .post('/users/me/membership/retry-payment')
        .set(...fakeAuthHeader(email))
        .expect(404);
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
