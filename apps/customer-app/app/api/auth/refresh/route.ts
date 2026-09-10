import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { AuthUser } from '@mucho-loco/types';
import { cognitoClient, COGNITO_CLIENT_ID } from '../../../../lib/cognito';
import { mapCognitoError } from '../../../../lib/cognito-errors';
import { verifyIdToken } from '../../../../lib/jwt';
import { REFRESH_COOKIE } from '../../../../lib/auth';
import { setSessionCookie, clearSessionCookies } from '../../../../lib/session';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'SESSION_EXPIRED' }, { status: 401 });
  }

  try {
    const auth = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }));
    const idToken = auth.AuthenticationResult?.IdToken;
    if (!idToken) {
      const response = NextResponse.json({ error: 'SESSION_EXPIRED' }, { status: 401 });
      clearSessionCookies(response);
      return response;
    }

    // REFRESH_TOKEN_AUTH no devuelve un refresh token nuevo — el mismo se
    // reusa hasta su propio vencimiento (30 días), no hace falta rotarlo.
    const claims = await verifyIdToken(idToken);
    const user: AuthUser = { email: claims.email, name: claims.name };
    const response = NextResponse.json({ ok: true, user });
    setSessionCookie(response, idToken);
    return response;
  } catch (err) {
    const { code, status } = mapCognitoError(err);
    const response = NextResponse.json({ error: code }, { status });
    clearSessionCookies(response);
    return response;
  }
}
