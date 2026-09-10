import { NextResponse } from 'next/server';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { AuthUser } from '@mucho-loco/types';
import { cognitoClient, COGNITO_CLIENT_ID } from '../../../../lib/cognito';
import { mapCognitoError } from '../../../../lib/cognito-errors';
import { verifyIdToken } from '../../../../lib/jwt';
import { setSessionCookies } from '../../../../lib/session';

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  try {
    const auth = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }));
    const idToken = auth.AuthenticationResult?.IdToken;
    const refreshToken = auth.AuthenticationResult?.RefreshToken;
    if (!idToken || !refreshToken) {
      return NextResponse.json({ error: 'UNKNOWN' }, { status: 500 });
    }

    const claims = await verifyIdToken(idToken);
    const user: AuthUser = { email: claims.email || email, name: claims.name };
    const response = NextResponse.json({ ok: true, user });
    setSessionCookies(response, { idToken, refreshToken });
    return response;
  } catch (err) {
    const { code, status } = mapCognitoError(err);
    return NextResponse.json({ error: code }, { status });
  }
}
