import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserHttpDatasource } from './user.http';
import { CommunityHttpDatasource } from './community.http';
import { PerformanceHttpDatasource } from './performance.http';
import { AnnouncementHttpDatasource } from './announcement.http';
import { SocialHttpDatasource } from './social.http';
import { MembershipHttpDatasource } from './membership.http';

function stubFetch(body: unknown = {}) {
  const spy = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

const call = (spy: ReturnType<typeof stubFetch>, i = 0) => ({
  url: String(spy.mock.calls[i][0]),
  init: (spy.mock.calls[i][1] ?? {}) as RequestInit,
  auth: ((spy.mock.calls[i][1]?.headers ?? {}) as Record<string, string>).Authorization,
});

/** Token de sesión falso — en producción sale de la cookie httpOnly ml_session. */
const token = async () => 'id-token';

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test'));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('public landing datasources', () => {
  it('hit their backend routes without a token', async () => {
    const spy = stubFetch([]);
    await new AnnouncementHttpDatasource().getAll();
    await new SocialHttpDatasource().getLinks();
    await new SocialHttpDatasource().getFeed();
    await new MembershipHttpDatasource().getTiers();

    expect(call(spy, 0).url).toBe('http://api.test/announcements');
    expect(call(spy, 1).url).toBe('http://api.test/social/links');
    expect(call(spy, 2).url).toBe('http://api.test/social/feed');
    expect(call(spy, 3).url).toBe('http://api.test/membership-tiers');
    expect(call(spy, 0).auth).toBeUndefined();
  });
});

describe('UserHttpDatasource', () => {
  it('maps every repository method to its /users/me route, always with the token', async () => {
    const spy = stubFetch({});
    const ds = new UserHttpDatasource(token);

    await ds.getProfile('ignored@mucholoco.mx');
    await ds.getMembership('ignored@mucholoco.mx');
    await ds.getVisitHistory('ignored@mucholoco.mx');
    await ds.getOrders('ignored@mucholoco.mx');
    await ds.retryMembershipPayment('ignored@mucholoco.mx');

    expect(call(spy, 0).url).toBe('http://api.test/users/me');
    expect(call(spy, 1).url).toBe('http://api.test/users/me/membership');
    expect(call(spy, 2).url).toBe('http://api.test/users/me/visits');
    expect(call(spy, 3).url).toBe('http://api.test/users/me/orders');
    expect(call(spy, 4).url).toBe('http://api.test/users/me/membership/retry-payment');
    expect(call(spy, 4).init.method).toBe('POST');
    expect(spy.mock.calls.every((_, i) => call(spy, i).auth === 'Bearer id-token')).toBe(true);
  });

  // La identidad del mock era un parámetro; la del backend es el ID token. Si
  // el email volviera a viajar en la URL o el body, un cliente podría leer la
  // cuenta de alguien más — ver "Seguridad" en apps/backend/CLAUDE.md.
  it('never puts the caller-supplied email in the request', async () => {
    const spy = stubFetch({});
    await new UserHttpDatasource(token).getProfile('otro@mucholoco.mx');

    const { url, init } = call(spy);
    expect(url).not.toContain('otro@mucholoco.mx');
    expect(String(init.body ?? '')).not.toContain('otro@mucholoco.mx');
  });

  it('posts an order as productId+qty with no client-supplied total', async () => {
    const spy = stubFetch({});
    await new UserHttpDatasource(token).createOrder(
      'diego@mucholoco.mx',
      [{ productId: 'p1', qty: 2 }],
      'card',
      'pickup',
      'es',
    );

    const { url, init } = call(spy);
    expect(url).toBe('http://api.test/users/me/orders');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      items: [{ productId: 'p1', qty: 2 }],
      paymentMethod: 'card',
      delivery: 'pickup',
      lang: 'es',
    });
    expect(String(init.body)).not.toContain('total');
  });

  it('never caches account data', async () => {
    const spy = stubFetch({});
    await new UserHttpDatasource(token).getOrders('diego@mucholoco.mx');

    expect(call(spy).init.cache).toBe('no-store');
  });

  it('fails with a readable message when there is no session cookie', async () => {
    stubFetch({});
    const ds = new UserHttpDatasource(async () => undefined);

    await expect(ds.getProfile('diego@mucholoco.mx')).rejects.toThrow(/ml_session/);
  });
});

describe('CommunityHttpDatasource', () => {
  it('maps every repository method to its /community/posts route', async () => {
    const spy = stubFetch({});
    const ds = new CommunityHttpDatasource(token);

    await ds.getFeed('diego@mucholoco.mx');
    await ds.createPost('diego@mucholoco.mx', 'hola');
    await ds.toggleLike('diego@mucholoco.mx', 'post-1');
    await ds.addComment('diego@mucholoco.mx', 'post-1', 'buen post');

    expect(call(spy, 0).url).toBe('http://api.test/community/posts');
    expect(call(spy, 1).url).toBe('http://api.test/community/posts');
    expect(call(spy, 1).init.method).toBe('POST');
    expect(call(spy, 2).url).toBe('http://api.test/community/posts/post-1/like');
    expect(call(spy, 3).url).toBe('http://api.test/community/posts/post-1/comments');
  });

  // El autor lo deriva el backend del ID token — el body solo lleva el texto.
  it('sends only the post body, never an author identity', async () => {
    const spy = stubFetch({});
    await new CommunityHttpDatasource(token).createPost('diego@mucholoco.mx', 'hola');

    expect(JSON.parse(String(call(spy).init.body))).toEqual({ body: 'hola' });
  });
});

describe('PerformanceHttpDatasource', () => {
  it('maps every repository method to its /performance route, with the token', async () => {
    const spy = stubFetch([]);
    const ds = new PerformanceHttpDatasource(token);

    await ds.getStats();
    await ds.getPersonalRecords();
    await ds.getWorkouts();
    await ds.getHeatmap();

    expect(call(spy, 0).url).toBe('http://api.test/performance/stats');
    expect(call(spy, 1).url).toBe('http://api.test/performance/records');
    expect(call(spy, 2).url).toBe('http://api.test/performance/workouts');
    expect(call(spy, 3).url).toBe('http://api.test/performance/heatmap');
    expect(call(spy, 3).auth).toBe('Bearer id-token');
  });
});
