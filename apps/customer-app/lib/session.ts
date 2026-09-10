import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, REFRESH_COOKIE } from './auth';
import { verifyIdToken } from './jwt';

// Debe coincidir con lo configurado en infra/modules/cognito (App Client):
// id_token_validity = 60 min, refresh_token_validity = 30 días.
const ID_TOKEN_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}

export function setSessionCookie(response: NextResponse, idToken: string): void {
  response.cookies.set(SESSION_COOKIE, idToken, cookieOptions(ID_TOKEN_MAX_AGE_SECONDS));
}

export function setSessionCookies(response: NextResponse, tokens: { idToken: string; refreshToken: string }): void {
  setSessionCookie(response, tokens.idToken);
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS));
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}

/**
 * Email del usuario logueado — usar en Server Components/Route Handlers
 * detrás del middleware de auth. Verifica firma/expiración/issuer/audience
 * contra Cognito (no solo decodifica) — el middleware solo comprueba que la
 * cookie EXISTA, así que esta es la única capa real contra una cookie
 * fabricada a mano. Devuelve null tanto si no hay cookie como si el JWT no
 * verifica — el caller debe tratar ambos casos como "sin sesión", nunca
 * seguir adelante con un email vacío/por defecto.
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!idToken) return null;
  try {
    return (await verifyIdToken(idToken)).email || null;
  } catch {
    return null;
  }
}
