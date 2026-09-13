import { AuthRequest, ResponseType, makeRedirectUri } from 'expo-auth-session';
import type { CognitoConfig, SocialGrant } from './cognito';
import { AuthError, type SocialProvider } from './types';

/**
 * A dónde regresa Cognito tras el login social: `mucholoco://auth/callback`
 * en el app, `http://localhost:8081/auth/callback` en la versión web. Los dos
 * están dados de alta en el app client `mobile` (infra/modules/cognito).
 *
 * En Expo Go esto NO funciona: ahí el scheme es exp:// y no se puede
 * registrar en Cognito. El login social se prueba con un build de desarrollo
 * (`npx expo run:ios` / EAS).
 */
export function socialRedirectUri(): string {
  return makeRedirectUri({ scheme: 'mucholoco', path: 'auth/callback' });
}

/**
 * Abre el Hosted UI directo en el proveedor (`identity_provider` salta el
 * selector de Cognito, igual que en la web) y espera el deep link de regreso.
 *
 * `AuthRequest` genera el verifier/challenge de PKCE (S256) y el `state`, y
 * rechaza un regreso cuyo `state` no coincida — la protección CSRF que en la
 * web hace la cookie `ml_oauth`.
 */
export async function promptSocialLogin(
  config: CognitoConfig & { domain: string },
  provider: SocialProvider,
): Promise<SocialGrant | null> {
  const redirectUri = socialRedirectUri();
  const request = new AuthRequest({
    clientId: config.clientId,
    redirectUri,
    responseType: ResponseType.Code,
    scopes: ['openid', 'email', 'profile'],
    usePKCE: true,
    extraParams: { identity_provider: provider },
  });

  // Solo el endpoint de autorización: el canje del code lo hace
  // `CognitoAuthService.exchangeCode` (probado en cognito.test.ts).
  const result = await request.promptAsync({
    authorizationEndpoint: `${config.domain}/oauth2/authorize`,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') return null;
  if (result.type !== 'success' || !result.params.code || !request.codeVerifier) {
    throw new AuthError('SOCIAL_LOGIN_FAILED');
  }
  return { code: result.params.code, codeVerifier: request.codeVerifier, redirectUri };
}
