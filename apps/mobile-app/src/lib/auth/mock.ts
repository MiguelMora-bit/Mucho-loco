import { toE164 } from '../phone';
import { AuthError, type AuthService, type Session, type SignUpInput, type SocialProvider } from './types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ONE_HOUR = 60 * 60_000;

/** Código que acepta la confirmación mock (Cognito real lo manda por email). */
export const MOCK_CONFIRMATION_CODE = '123456';

/** Emails que ya "existen": los socios curados de los mocks. */
const EXISTING = new Set(['diego@mucholoco.mx', 'valeria@mucholoco.mx']);

function mockSession(email: string): Session {
  return {
    email,
    idToken: `mock-id-token.${email}`,
    refreshToken: 'mock-refresh-token',
    expiresAt: Date.now() + ONE_HOUR,
  };
}

/** La misma política que el User Pool (infra/modules/cognito): 8+, mayúscula, minúscula y número. */
function meetsPasswordPolicy(password: string): boolean {
  return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

/**
 * Auth de mentira para el modo mock-first (el default). El flujo del socio
 * tiene que poder recorrerse completo sin User Pool vivo.
 *
 * Imita las reglas de Cognito que la UI necesita ejercitar: login con
 * cualquier email y 8+ caracteres (con `diego@`/`valeria@` se ven los datos
 * curados de los mocks), registro con la misma política de contraseña,
 * teléfono válido, y confirmación con el código `123456`.
 */
export class MockAuthService implements AuthService {
  readonly kind = 'mock' as const;
  readonly socialProviders: SocialProvider[] = [];

  async signIn(email: string, password: string): Promise<Session> {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL.test(normalized) || password.length < 8) {
      throw new AuthError('WRONG_CREDENTIALS');
    }
    return mockSession(normalized);
  }

  async signUp(input: SignUpInput): Promise<void> {
    const email = input.email.trim().toLowerCase();
    if (EXISTING.has(email)) throw new AuthError('USER_EXISTS');
    if (!meetsPasswordPolicy(input.password)) throw new AuthError('INVALID_PASSWORD');
    if (!toE164(input.phone)) throw new AuthError('INVALID_PHONE');
  }

  async confirmSignUp(_email: string, code: string): Promise<void> {
    if (code.trim() !== MOCK_CONFIRMATION_CODE) throw new AuthError('CODE_MISMATCH');
  }

  async resendCode(): Promise<void> {}

  async refresh(session: Session): Promise<Session> {
    return { ...session, expiresAt: Date.now() + ONE_HOUR };
  }

  async signInWithProvider(): Promise<Session | null> {
    throw new AuthError('SOCIAL_LOGIN_FAILED');
  }

  async signOut(): Promise<void> {}
}
