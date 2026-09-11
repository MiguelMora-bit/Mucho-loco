import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePkce, generateState } from '../../../../../lib/pkce';

const cookiesMock = vi.fn();
vi.mock('next/headers', () => ({ cookies: cookiesMock }));

vi.mock('../../../../../lib/cognito', () => ({
  COGNITO_DOMAIN: 'https://mucho-loco-gym-dev.auth.us-east-1.amazoncognito.com',
  COGNITO_CLIENT_ID: 'test-client-id',
}));

const verifyIdTokenMock = vi.fn();
vi.mock('../../../../../lib/jwt', () => ({ verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args) }));

const { GET } = await import('./route');

function req(query: string) {
  return new Request(`http://localhost/api/auth/social/callback${query}`);
}

function cookieJar(value: string | undefined) {
  cookiesMock.mockResolvedValue({ get: (name: string) => (name === 'ml_oauth' && value !== undefined ? { value } : undefined) });
}

/** A valid {nonce, verifier} cookie + matching state, as social/start would have produced. */
function validPkceRound(nextPath = '/dashboard') {
  const { verifier } = generatePkce();
  const { state, nonce } = generateState(nextPath);
  cookieJar(JSON.stringify({ nonce, verifier }));
  return { state, verifier };
}

beforeEach(() => {
  cookiesMock.mockReset();
  verifyIdTokenMock.mockReset();
  vi.stubGlobal('fetch', vi.fn());
});

function expectFailRedirect(res: Response) {
  expect(res.headers.get('location')).toBe('http://localhost/account?error=SOCIAL_LOGIN_FAILED');
}

describe('GET /api/auth/social/callback', () => {
  it('fails when Cognito/the IdP reports an error param, without attempting the token exchange', async () => {
    cookieJar(undefined);
    const res = await GET(req('?error=access_denied'));
    expectFailRedirect(res);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails when code or state is missing', async () => {
    cookieJar(undefined);
    expectFailRedirect(await GET(req('')));
    expectFailRedirect(await GET(req('?code=abc')));
  });

  it('fails when the PKCE cookie is missing (e.g. cookie expired or callback replayed)', async () => {
    const { state } = generateState('/dashboard');
    cookieJar(undefined);
    const res = await GET(req(`?code=abc&state=${state}`));
    expectFailRedirect(res);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails on a malformed state', async () => {
    cookieJar(JSON.stringify({ nonce: 'n', verifier: 'v' }));
    const res = await GET(req('?code=abc&state=not-a-valid-state'));
    expectFailRedirect(res);
  });

  it('fails when the state nonce does not match the cookie nonce (CSRF), before ever calling the token endpoint', async () => {
    const { state } = generateState('/dashboard');
    cookieJar(JSON.stringify({ nonce: 'a-different-nonce', verifier: 'v' }));
    const res = await GET(req(`?code=abc&state=${state}`));
    expectFailRedirect(res);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails when the token endpoint responds non-ok', async () => {
    const { state } = validPkceRound();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    const res = await GET(req(`?code=abc&state=${state}`));
    expectFailRedirect(res);
  });

  it('fails when the token response is missing id_token or refresh_token', async () => {
    const { state } = validPkceRound();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ id_token: 'only-this' }) });
    const res = await GET(req(`?code=abc&state=${state}`));
    expectFailRedirect(res);
  });

  it('fails when the returned ID token does not verify', async () => {
    const { state } = validPkceRound();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: 'id-tok', refresh_token: 'refresh-tok' }),
    });
    verifyIdTokenMock.mockRejectedValue(new Error('signature verification failed'));
    const res = await GET(req(`?code=abc&state=${state}`));
    expectFailRedirect(res);
  });

  it('on success: exchanges the code with the matching code_verifier, sets session cookies, clears the PKCE cookie, and redirects to next', async () => {
    const { state, verifier } = validPkceRound('/checkout');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: 'id-tok', refresh_token: 'refresh-tok' }),
    });
    verifyIdTokenMock.mockResolvedValue({ email: 'diego@mucholoco.mx', name: 'Diego' });

    const res = await GET(req(`?code=auth-code-123&state=${state}`));

    expect(res.headers.get('location')).toBe('http://localhost/checkout');
    expect(res.cookies.get('ml_session')?.value).toBe('id-tok');
    expect(res.cookies.get('ml_refresh')?.value).toBe('refresh-tok');
    expect(res.cookies.get('ml_oauth')?.value).toBeFalsy();

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url.toString()).toBe('https://mucho-loco-gym-dev.auth.us-east-1.amazoncognito.com/oauth2/token');
    const sentBody = new URLSearchParams(init.body as string);
    expect(sentBody.get('grant_type')).toBe('authorization_code');
    expect(sentBody.get('client_id')).toBe('test-client-id');
    expect(sentBody.get('code')).toBe('auth-code-123');
    expect(sentBody.get('code_verifier')).toBe(verifier);
    expect(sentBody.get('redirect_uri')).toBe('http://localhost/api/auth/social/callback');
  });

  it('falls back to /dashboard when the state carries an unsafe next path', async () => {
    const { verifier } = generatePkce();
    const { nonce } = generateState('/dashboard');
    const forgedState = `${nonce}.${encodeURIComponent('//evil.com')}`;
    cookieJar(JSON.stringify({ nonce, verifier }));
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: 'id-tok', refresh_token: 'refresh-tok' }),
    });
    verifyIdTokenMock.mockResolvedValue({ email: 'diego@mucholoco.mx', name: 'Diego' });

    const res = await GET(req(`?code=abc&state=${forgedState}`));
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');
  });
});
