import { CognitoAuthService, type CognitoConfig } from './cognito';
import { MockAuthService } from './mock';
import { promptSocialLogin } from './social';
import type { AuthService } from './types';

/**
 * `EXPO_PUBLIC_AUTH=cognito` activa Cognito real; cualquier otro valor (o su
 * ausencia) deja el mock — igual que `EXPO_PUBLIC_DATA_SOURCE` con los datos.
 * Las variables van escritas literales: Expo las reemplaza al compilar.
 */
function cognitoConfig(): CognitoConfig | null {
  if (process.env.EXPO_PUBLIC_AUTH !== 'cognito') return null;
  const region = process.env.EXPO_PUBLIC_COGNITO_REGION;
  const clientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID;
  if (!region || !clientId) {
    throw new Error(
      'EXPO_PUBLIC_AUTH=cognito requiere EXPO_PUBLIC_COGNITO_REGION y EXPO_PUBLIC_COGNITO_CLIENT_ID (terraform output mobile_client_id)',
    );
  }
  return { region, clientId, domain: process.env.EXPO_PUBLIC_COGNITO_DOMAIN || undefined };
}

const config = cognitoConfig();

export const authService: AuthService = config
  ? new CognitoAuthService(config, promptSocialLogin)
  : new MockAuthService();
