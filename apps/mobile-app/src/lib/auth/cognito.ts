import { cognitoErrorCode } from '@mucho-loco/customer-core/cognito-errors';
import { toE164 } from '../phone';
import { decodeJwtPayload } from './jwt';
import { AuthError, type AuthService, type Session, type SignUpInput, type SocialProvider } from './types';

export interface CognitoConfig {
  region: string;
  /** App client `mobile` (infra/modules/cognito): público, sin secreto. */
  clientId: string;
  /** Hosted UI, `https://<prefix>.auth.<region>.amazoncognito.com`. Sin él no hay login social. */
  domain?: string;
}

/** Lo que regresa el navegador tras el login social: el code y el verifier PKCE con el que se pidió. */
export interface SocialGrant {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

/**
 * Abre el Hosted UI y espera el regreso al deep link. Se inyecta (la real
 * vive en `social.ts`, sobre expo-auth-session) para que este archivo no
 * dependa de React Native y se pueda probar en Node.
 */
export type SocialPrompt = (
  config: CognitoConfig & { domain: string },
  provider: SocialProvider,
) => Promise<SocialGrant | null>;

interface AuthenticationResult {
  IdToken?: string;
  RefreshToken?: string;
}

const PROVIDERS: SocialProvider[] = ['Google', 'Facebook'];

export function sessionFromTokens(idToken: string, refreshToken: string): Session {
  const claims = decodeJwtPayload(idToken);
  return {
    email: typeof claims.email === 'string' ? claims.email : '',
    idToken,
    refreshToken,
    expiresAt: typeof claims.exp === 'number' ? claims.exp * 1000 : 0,
  };
}

/**
 * Cognito hablado directo desde el teléfono, sin SDK y sin servidor en medio.
 *
 * En customer-app el navegador nunca llama a AWS: pasa por las rutas
 * `/api/auth/*` de Next. Aquí no hay servidor propio, pero tampoco hace
 * falta: el app client es público (sin secreto), y el API de user pools
 * acepta estas operaciones sin firmar con credenciales de AWS. Es un POST
 * JSON con el nombre de la operación en `X-Amz-Target`.
 */
export class CognitoAuthService implements AuthService {
  readonly kind = 'cognito' as const;
  readonly socialProviders: SocialProvider[];
  private readonly config: CognitoConfig;
  private readonly prompt: SocialPrompt;

  constructor(config: CognitoConfig, prompt: SocialPrompt) {
    this.config = config;
    this.prompt = prompt;
    this.socialProviders = config.domain ? PROVIDERS : [];
  }

  private async call<T>(action: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://cognito-idp.${this.config.region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new AuthError(cognitoErrorCode(typeof data.__type === 'string' ? data.__type : ''));
    }
    return data as T;
  }

  async signIn(email: string, password: string): Promise<Session> {
    const out = await this.call<{ AuthenticationResult?: AuthenticationResult }>('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: this.config.clientId,
      AuthParameters: { USERNAME: email.trim(), PASSWORD: password },
    });
    const result = out.AuthenticationResult;
    // Sin tokens = Cognito pidió un challenge (NEW_PASSWORD_REQUIRED, MFA).
    // Solo le pasa a cuentas de staff creadas con contraseña temporal, que no
    // entran por este app.
    if (!result?.IdToken || !result.RefreshToken) throw new AuthError('UNKNOWN');
    return sessionFromTokens(result.IdToken, result.RefreshToken);
  }

  async signUp(input: SignUpInput): Promise<void> {
    const phone = toE164(input.phone);
    if (!phone) throw new AuthError('INVALID_PHONE');
    await this.call('SignUp', {
      ClientId: this.config.clientId,
      Username: input.email.trim(),
      Password: input.password,
      UserAttributes: [
        { Name: 'email', Value: input.email.trim() },
        { Name: 'name', Value: input.name.trim() },
        { Name: 'phone_number', Value: phone },
      ],
    });
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    await this.call('ConfirmSignUp', {
      ClientId: this.config.clientId,
      Username: email.trim(),
      ConfirmationCode: code.trim(),
    });
  }

  async resendCode(email: string): Promise<void> {
    await this.call('ResendConfirmationCode', { ClientId: this.config.clientId, Username: email.trim() });
  }

  async refresh(session: Session): Promise<Session> {
    const out = await this.call<{ AuthenticationResult?: AuthenticationResult }>('InitiateAuth', {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: this.config.clientId,
      AuthParameters: { REFRESH_TOKEN: session.refreshToken },
    });
    const idToken = out.AuthenticationResult?.IdToken;
    if (!idToken) throw new AuthError('WRONG_CREDENTIALS');
    // REFRESH_TOKEN_AUTH no devuelve refresh token nuevo (sin rotación en el
    // app client): el mismo sirve hasta su vencimiento, 30 días.
    return sessionFromTokens(idToken, session.refreshToken);
  }

  async signInWithProvider(provider: SocialProvider): Promise<Session | null> {
    const { domain } = this.config;
    if (!domain) throw new AuthError('SOCIAL_LOGIN_FAILED');
    const grant = await this.prompt({ ...this.config, domain }, provider);
    if (!grant) return null;
    return this.exchangeCode(domain, grant);
  }

  /**
   * Code → tokens en `/oauth2/token`. Con PKCE y sin client_secret: el
   * `code_verifier` prueba que quien canjea el code es quien lo pidió, que es
   * lo que en un cliente confidencial haría el secreto.
   */
  private async exchangeCode(domain: string, grant: SocialGrant): Promise<Session> {
    const res = await fetch(`${domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        code: grant.code,
        redirect_uri: grant.redirectUri,
        code_verifier: grant.codeVerifier,
      }).toString(),
    });
    const data = (await res.json().catch(() => ({}))) as { id_token?: string; refresh_token?: string };
    if (!res.ok || !data.id_token || !data.refresh_token) throw new AuthError('SOCIAL_LOGIN_FAILED');
    return sessionFromTokens(data.id_token, data.refresh_token);
  }

  /**
   * Revoca el refresh token: invalida también los ID/access emitidos con él
   * (requiere `enable_token_revocation` en el app client). Solo cierra ESTE
   * teléfono; las otras sesiones del socio siguen vivas.
   */
  async signOut(session: Session): Promise<void> {
    await this.call('RevokeToken', { Token: session.refreshToken, ClientId: this.config.clientId });
  }
}
