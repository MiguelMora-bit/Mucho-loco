import { NextResponse } from 'next/server';
import { COGNITO_DOMAIN, COGNITO_CLIENT_ID } from '../../../../../lib/cognito';
import { generatePkce, generateState, isSafeNextPath } from '../../../../../lib/pkce';

const PROVIDERS = new Set(['Google', 'Facebook']);
const OAUTH_COOKIE = 'ml_oauth';
const OAUTH_COOKIE_PATH = '/api/auth/social';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') || '';
  const rawNext = url.searchParams.get('next') || '/dashboard';
  const nextPath = isSafeNextPath(rawNext) ? rawNext : '/dashboard';

  if (!PROVIDERS.has(provider)) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  const { verifier, challenge } = generatePkce();
  const { state, nonce } = generateState(nextPath);
  const redirectUri = new URL('/api/auth/social/callback', request.url).toString();

  const authorizeUrl = new URL('/oauth2/authorize', COGNITO_DOMAIN);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', COGNITO_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'openid email profile');
  authorizeUrl.searchParams.set('identity_provider', provider); // salta el picker de Hosted UI, va directo al IdP
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ nonce, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // necesario: la cookie debe ir en el GET top-level que Cognito hace de vuelta tras el IdP externo
    maxAge: 300,
    path: OAUTH_COOKIE_PATH,
  });
  return response;
}
