import { NextResponse } from 'next/server';
import { ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient, COGNITO_CLIENT_ID } from '../../../../lib/cognito';
import { mapCognitoError } from '../../../../lib/cognito-errors';

export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };

  if (!email) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }

  try {
    await cognitoClient.send(new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
    }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, status } = mapCognitoError(err);
    return NextResponse.json({ error: code }, { status });
  }
}
