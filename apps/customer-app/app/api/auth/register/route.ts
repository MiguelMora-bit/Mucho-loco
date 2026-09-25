import { NextResponse } from 'next/server';
import { SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { toE164 } from '@mucho-loco/customer-core/phone';
import { cognitoClient, COGNITO_CLIENT_ID } from '../../../../lib/cognito';
import { mapCognitoError } from '../../../../lib/cognito-errors';

export async function POST(request: Request) {
  const { email, password, name, phone } = await request.json() as {
    email?: string;
    password?: string;
    name?: string;
    phone?: unknown;
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
  }
  // Spec 007: el teléfono es el canal de los avisos de WhatsApp. El backend lo
  // lee del claim `phone_number` al crear al socio, igual que para el móvil.
  const phoneNumber = typeof phone === 'string' ? toE164(phone) : null;
  if (!phoneNumber) {
    return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
  }

  try {
    await cognitoClient.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'phone_number', Value: phoneNumber },
        ...(name ? [{ Name: 'name', Value: name }] : []),
      ],
    }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, status } = mapCognitoError(err);
    return NextResponse.json({ error: code }, { status });
  }
}
