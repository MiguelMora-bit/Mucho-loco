import { cognitoErrorCode, type CognitoErrorCode } from '@mucho-loco/customer-core/cognito-errors';

interface MappedError {
  code: CognitoErrorCode;
  status: number;
}

// El código lo decide customer-core (lo comparte mobile-app); el status HTTP
// es cosa de ESTE app, porque solo aquí hay rutas `/api/auth/*` que responder.
const STATUS: Record<CognitoErrorCode, number> = {
  USER_EXISTS: 409,
  INVALID_PASSWORD: 400,
  NOT_CONFIRMED: 403,
  WRONG_CREDENTIALS: 401,
  CODE_MISMATCH: 400,
  CODE_EXPIRED: 400,
  TOO_MANY_ATTEMPTS: 429,
  UNKNOWN: 500,
};

/** Traduce excepciones del SDK de Cognito a un código corto + status HTTP que la ruta puede responder al cliente. */
export function mapCognitoError(err: unknown): MappedError {
  const code = cognitoErrorCode(err instanceof Error ? err.name : '');
  return { code, status: STATUS[code] };
}
