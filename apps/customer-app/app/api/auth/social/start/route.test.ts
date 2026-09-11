import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';

vi.mock('../../../../../lib/cognito', () => ({
  COGNITO_DOMAIN: 'https://mucho-loco-gym-dev.auth.us-east-1.amazoncognito.com',
  COGNITO_CLIENT_ID: 'test-client-id',
}));

const { GET } = await import('./route');

function req(query: string) {
  return new Request(`http://localhost/api/auth/social/start${query}`);
}

function decodeVerifier(location: string): string {
  const url = new URL(location);
  return url.searchParams.get('code_challenge')!;
}

describe('GET /api/auth/social/start', () => {
  it('redirects to /account for an unsupported provider, without setting the PKCE cookie', async () => {
    const res = await GET(req('?provider=Twitter&next=/dashboard'));
    expect(res.headers.get('location')).toBe('http://localhost/account');
    expect(res.cookies.get('ml_oauth')).toBeUndefined();
  });

  it('redirects to the Cognito Hosted UI authorize endpoint with identity_provider set (skips the picker)', async () => {
    const res = await GET(req('?provider=Google&next=/dashboard'));
    const location = new URL(res.headers.get('location')!);

    expect(location.origin + location.pathname).toBe('https://mucho-loco-gym-dev.auth.us-east-1.amazoncognito.com/oauth2/authorize');
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(location.searchParams.get('client_id')).toBe('test-client-id');
    expect(location.searchParams.get('redirect_uri')).toBe('http://localhost/api/auth/social/callback');
    expect(location.searchParams.get('identity_provider')).toBe('Google');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('scope')).toBe('openid email profile');
  });

  it('sets an httpOnly PKCE cookie scoped to /api/auth/social whose verifier hashes to the sent challenge', async () => {
    const res = await GET(req('?provider=Google&next=/dashboard'));
    const location = new URL(res.headers.get('location')!);
    const cookie = res.cookies.get('ml_oauth');

    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe('/api/auth/social');

    const { verifier, nonce } = JSON.parse(cookie!.value);
    const expectedChallenge = createHash('sha256').update(verifier).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeVerifier(location.toString())).toBe(expectedChallenge);

    const state = location.searchParams.get('state')!;
    expect(state.startsWith(`${nonce}.`)).toBe(true);
  });

  it('embeds the requested next path in state', async () => {
    const res = await GET(req('?provider=Facebook&next=%2Fcheckout'));
    const location = new URL(res.headers.get('location')!);
    expect(decodeURIComponent(location.searchParams.get('state')!.split('.')[1])).toBe('/checkout');
  });

  it('falls back to /dashboard when next is an open-redirect attempt', async () => {
    const res = await GET(req('?provider=Google&next=%2F%2Fevil.com'));
    const location = new URL(res.headers.get('location')!);
    expect(decodeURIComponent(location.searchParams.get('state')!.split('.')[1])).toBe('/dashboard');
  });
});
