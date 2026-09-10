import fs from 'node:fs';
import path from 'node:path';
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

export const E2E_TEST_EMAIL = 'e2e.playwright@mucholoco.mx';
export const E2E_TEST_PASSWORD = 'Bestia123!';
export const E2E_TEST_NAME = 'Diego E2E';

// Next.js carga .env.local solo para su propio proceso (pnpm dev); el runner
// de Playwright es un proceso Node aparte y necesita cargarlo por su cuenta.
function loadEnvLocal(): void {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}

/**
 * Deja un usuario Cognito fijo, confirmado, con password conocida, para que
 * auth.spec.ts pueda loguear de verdad contra el User Pool real de dev.
 * AdminCreateUser + AdminSetUserPassword (Permanent) es el mismo patrón que
 * usará el alta de staff/gerente/dueño (self-signup deshabilitado para esos roles).
 */
export default async function globalSetup(): Promise<void> {
  loadEnvLocal();

  const client = new CognitoIdentityProviderClient({ region: process.env.COGNITO_REGION });
  const userPoolId = process.env.COGNITO_USER_POOL_ID as string;

  try {
    await client.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: E2E_TEST_EMAIL,
      UserAttributes: [
        { Name: 'email', Value: E2E_TEST_EMAIL },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: E2E_TEST_NAME },
      ],
      MessageAction: 'SUPPRESS',
    }));
  } catch (err) {
    if (!(err instanceof Error) || err.name !== 'UsernameExistsException') throw err;
  }

  await client.send(new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: E2E_TEST_EMAIL,
    Password: E2E_TEST_PASSWORD,
    Permanent: true,
  }));
}
