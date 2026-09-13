import type { CognitoErrorCode } from '@mucho-loco/customer-core/cognito-errors';

/**
 * Sesión del socio en el teléfono. En customer-app esto son dos cookies
 * httpOnly (`ml_session`, `ml_refresh`) que maneja el servidor de Next; aquí
 * no hay servidor propio, así que la app guarda los tokens ella misma — en el
 * llavero del sistema operativo (`secure-storage.ts`).
 */
export interface Session {
  email: string;
  /** ID token de Cognito: lo que va en `Authorization: Bearer` al backend. */
  idToken: string;
  refreshToken: string;
  /** Vencimiento del ID token, en ms desde epoch (claim `exp`). */
  expiresAt: number;
}

/**
 * Los mismos códigos que customer-app (vienen de customer-core) para
 * traducirlos con las mismas claves `t.account.errors.*`, más dos que solo
 * existen en el móvil.
 */
export type AuthErrorCode = CognitoErrorCode | 'SOCIAL_LOGIN_FAILED' | 'INVALID_PHONE';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  /** Como lo escribió el socio; el servicio lo normaliza a E.164. */
  phone: string;
}

/** Nombres de los IdPs tal como están dados de alta en el User Pool (`provider_name`). */
export type SocialProvider = 'Google' | 'Facebook';

/**
 * Contrato de autenticación del móvil. Lo cumplen `MockAuthService`
 * (mock-first, default) y `CognitoAuthService` (`EXPO_PUBLIC_AUTH=cognito`).
 * Las pantallas y el store de sesión no saben cuál está activo.
 */
export interface AuthService {
  readonly kind: 'mock' | 'cognito';
  /** Vacío si no hay login social (mock, o Cognito sin dominio de Hosted UI). */
  readonly socialProviders: SocialProvider[];
  signIn(email: string, password: string): Promise<Session>;
  signUp(input: SignUpInput): Promise<void>;
  /** Código de 6 dígitos que Cognito manda por email al registrarse. */
  confirmSignUp(email: string, code: string): Promise<void>;
  resendCode(email: string): Promise<void>;
  /** ID token nuevo con el refresh token. El refresh token no rota: se conserva. */
  refresh(session: Session): Promise<Session>;
  /** `null` si el socio cerró el navegador sin terminar. */
  signInWithProvider(provider: SocialProvider): Promise<Session | null>;
  signOut(session: Session): Promise<void>;
}
