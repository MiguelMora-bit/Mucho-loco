import { NextResponse } from 'next/server';
import { SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, COGNITO_CLIENT_ID } from '../../../../lib/cognito';
import { mapCognitoError } from '../../../../lib/cognito-errors';

export async function POST(request: Request) {
  const { email, password, name } = await request.json() as { email?: string; password?: string; name?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  try {
    await cognitoClient.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        ...(name ? [{ Name: 'name', Value: name }] : []),
      ],
    }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, status } = mapCognitoError(err);
    return NextResponse.json({ error: code }, { status });
  }
}
