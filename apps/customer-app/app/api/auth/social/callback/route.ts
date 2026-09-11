import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COGNITO_DOMAIN, COGNITO_CLIENT_ID } from '../../../../../lib/cognito';
import { parseState, isSafeNextPath } from '../../../../../lib/pkce';
import { verifyIdToken } from '../../../../../lib/jwt';
import { setSessionCookies } from '../../../../../lib/session';

const OAUTH_COOKIE = 'ml_oauth';
const OAUTH_COOKIE_PATH = '/api/auth/social';

function failRedirect(request: Request): NextResponse {
  const url = new URL('/account', request.url);
  url.searchParams.set('error', 'SOCIAL_LOGIN_FAILED');
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: OAUTH_COOKIE, path: OAUTH_COOKIE_PATH });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const idpError = url.searchParams.get('error'); // el usuario canceló, o el IdP rechazó

  const cookieStore = await cookies();
  const raw = cookieStore.get(OAUTH_COOKIE)?.value;

  if (idpError || !code || !state || !raw) return failRedirect(request);

  const parsedState = parseState(state);
  if (!parsedState) return failRedirect(request);

  let saved: { nonce: string; verifier: string };
  try {
    saved = JSON.parse(raw);
  } catch {
    return failRedirect(request);
  }
  if (saved.nonce !== parsedState.nonce) return failRedirect(request); // CSRF/replay

  const nextPath = isSafeNextPath(parsedState.nextPath) ? parsedState.nextPath : '/dashboard';
  const redirectUri = new URL('/api/auth/social/callback', request.url).toString();

  try {
    const tokenRes = await fetch(new URL('/oauth2/token', COGNITO_DOMAIN), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: COGNITO_CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: saved.verifier,
      }),
    });
    if (!tokenRes.ok) return failRedirect(request);

    const tokens = await tokenRes.json() as { id_token?: string; refresh_token?: string };
    if (!tokens.id_token || !tokens.refresh_token) return failRedirect(request);

    await verifyIdToken(tokens.id_token); // firma/expiración/issuer/audience — no confiar ciegamente en el token endpoint

    const response = NextResponse.redirect(new URL(nextPath, request.url));
    setSessionCookies(response, { idToken: tokens.id_token, refreshToken: tokens.refresh_token });
    response.cookies.delete({ name: OAUTH_COOKIE, path: OAUTH_COOKIE_PATH });
    return response;
  } catch {
    return failRedirect(request);
  }
}
