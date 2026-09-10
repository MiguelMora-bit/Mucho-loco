/** Traduce excepciones del SDK de Cognito a un código corto — solo login, sin self-signup (altas de staff son AdminCreateUser). */
export function mapCognitoError(err: unknown): string {
  const name = err instanceof Error ? err.name : '';

  switch (name) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return 'WRONG_CREDENTIALS';
    case 'UserNotConfirmedException':
      return 'NOT_CONFIRMED';
    case 'PasswordResetRequiredException':
      return 'PASSWORD_RESET_REQUIRED';
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return 'TOO_MANY_ATTEMPTS';
    default:
      return 'UNKNOWN';
  }
}
