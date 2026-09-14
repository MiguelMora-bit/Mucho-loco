/**
 * Excepciones de Cognito → código corto, con el que la UI elige el mensaje
 * (`t.account.errors.*`). Nunca se le muestra al socio el texto crudo de AWS.
 *
 * Lo comparten los dos clientes del socio: customer-app (sus rutas
 * `/api/auth/*`, vía el SDK, que pone el nombre en `err.name`) y mobile-app
 * (que habla con el API JSON de Cognito directo, que lo pone en `__type`).
 */
export type CognitoErrorCode =
  | 'USER_EXISTS'
  | 'INVALID_PASSWORD'
  | 'NOT_CONFIRMED'
  | 'WRONG_CREDENTIALS'
  | 'CODE_MISMATCH'
  | 'CODE_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'UNKNOWN';

export function cognitoErrorCode(exceptionName: string): CognitoErrorCode {
  // El API JSON a veces manda el tipo con namespace:
  // "com.amazonaws.cognito.identity.idp.model#NotAuthorizedException".
  const name = exceptionName.slice(exceptionName.lastIndexOf('#') + 1);

  switch (name) {
    case 'UsernameExistsException':
      return 'USER_EXISTS';
    case 'InvalidPasswordException':
      return 'INVALID_PASSWORD';
    case 'UserNotConfirmedException':
      return 'NOT_CONFIRMED';
    case 'NotAuthorizedException':
    // UserNotFoundException se mapea igual que credenciales incorrectas — no
    // le decimos a un atacante si un email existe o no.
    case 'UserNotFoundException':
      return 'WRONG_CREDENTIALS';
    case 'CodeMismatchException':
      return 'CODE_MISMATCH';
    case 'ExpiredCodeException':
      return 'CODE_EXPIRED';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
    case 'TooManyFailedAttemptsException':
      return 'TOO_MANY_ATTEMPTS';
    default:
      return 'UNKNOWN';
  }
}
