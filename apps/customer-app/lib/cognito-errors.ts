interface MappedError {
  code: string;
  status: number;
}

/** Traduce excepciones del SDK de Cognito a un código corto + status HTTP que la ruta puede responder al cliente. */
export function mapCognitoError(err: unknown): MappedError {
  const name = err instanceof Error ? err.name : '';

  switch (name) {
    case 'UsernameExistsException':
      return { code: 'USER_EXISTS', status: 409 };
    case 'InvalidPasswordException':
      return { code: 'INVALID_PASSWORD', status: 400 };
    case 'UserNotConfirmedException':
      return { code: 'NOT_CONFIRMED', status: 403 };
    case 'NotAuthorizedException':
    // UserNotFoundException se mapea igual que credenciales incorrectas —
    // no le decimos a un atacante si un email existe o no.
    case 'UserNotFoundException':
      return { code: 'WRONG_CREDENTIALS', status: 401 };
    case 'CodeMismatchException':
      return { code: 'CODE_MISMATCH', status: 400 };
    case 'ExpiredCodeException':
      return { code: 'CODE_EXPIRED', status: 400 };
    case 'LimitExceededException':
    case 'TooManyRequestsException':
    case 'TooManyFailedAttemptsException':
      return { code: 'TOO_MANY_ATTEMPTS', status: 429 };
    default:
      return { code: 'UNKNOWN', status: 500 };
  }
}
