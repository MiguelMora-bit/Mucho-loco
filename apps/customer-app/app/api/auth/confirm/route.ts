import { NextResponse } from 'next/server';
import { ConfirmSignUpCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { AuthUser } from '@mucho-loco/types';
import { cognitoClient, COGNITO_CLIENT_ID } from '../../../../lib/cognito';
import { mapCognitoError } from '../../../../lib/cognito-errors';
import { decodeIdToken } from '../../../../lib/jwt';
import { setSessionCookies } from '../../../../lib/session';

export async function POST(request: Request) {
  const { email, code, password } = await request.json() as { email?: string; code?: string; password?: string };

  if (!email || !code) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  try {
    await cognitoClient.send(new ConfirmSignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }));

    // Sin password no podemos autologuear (p.ej. si algún día se confirma desde
    // otro dispositivo) — la cuenta queda confirmada, el cliente manda a login.
    if (!password) {
      return NextResponse.json({ ok: true });
    }

    const auth = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }));
    const idToken = auth.AuthenticationResult?.IdToken;
    const refreshToken = auth.AuthenticationResult?.RefreshToken;
    if (!idToken || !refreshToken) {
      return NextResponse.json({ ok: true });
    }

    const claims = decodeIdToken(idToken);
    const user: AuthUser = { email: claims.email || email, name: claims.name };
    const response = NextResponse.json({ ok: true, user });
    setSessionCookies(response, { idToken, refreshToken });
    return response;
  } catch (err) {
    const { code: errorCode, status } = mapCognitoError(err);
    return NextResponse.json({ error: errorCode }, { status });
  }
}
