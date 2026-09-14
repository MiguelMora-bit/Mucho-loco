import type { Translations } from '@mucho-loco/types';
import type { MobileMessages } from '../mobile-messages';
import { AuthError, type AuthErrorCode } from './types';

/** Código de un error de auth, o `UNKNOWN` si no es uno nuestro (red caída, bug). */
export function authErrorCode(err: unknown): AuthErrorCode {
  return err instanceof AuthError ? err.code : 'UNKNOWN';
}

/** Mismas claves que usa `AccountClient` en customer-app, más las dos del móvil. */
export function authErrorMessage(code: AuthErrorCode, t: Translations, m: MobileMessages): string {
  switch (code) {
    case 'WRONG_CREDENTIALS':
      return t.account.errors.wrongCredentials;
    case 'INVALID_PASSWORD':
      return t.account.errors.invalidPassword;
    case 'NOT_CONFIRMED':
      return t.account.errors.notConfirmed;
    case 'USER_EXISTS':
      return t.account.errors.userExists;
    case 'CODE_MISMATCH':
      return t.account.errors.codeMismatch;
    case 'CODE_EXPIRED':
      return t.account.errors.codeExpired;
    case 'TOO_MANY_ATTEMPTS':
      return t.account.errors.tooManyAttempts;
    case 'SOCIAL_LOGIN_FAILED':
      return t.account.errors.socialLoginFailed;
    case 'INVALID_PHONE':
      return m.auth.invalidPhone;
    case 'UNKNOWN':
      return t.account.errorLogin;
  }
}
