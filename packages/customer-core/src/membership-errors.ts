import { ApiRequestError } from '@mucho-loco/api-client';

/**
 * Rechazos de negocio al contratar o pagar la membresía — los mismos códigos
 * que el backend promete en el cuerpo del 4xx (`common/error-codes.ts`).
 */
export type MembershipErrorCode =
  | 'ALREADY_SUBSCRIBED'
  | 'MEMBERSHIP_STILL_ACTIVE'
  | 'NOTHING_TO_PAY'
  | 'NO_BILLING_ACCOUNT'
  | 'BRANCH_NOT_FOUND';

const CODES: readonly string[] = [
  'ALREADY_SUBSCRIBED',
  'MEMBERSHIP_STILL_ACTIVE',
  'NOTHING_TO_PAY',
  'NO_BILLING_ACCOUNT',
  'BRANCH_NOT_FOUND',
];

/** Lo que tira el mock para el mismo rechazo que el backend responde con 409/404. */
export class MembershipError extends Error {
  readonly name = 'MembershipError';
  readonly code: MembershipErrorCode;

  constructor(code: MembershipErrorCode) {
    super(code);
    this.code = code;
  }
}

/**
 * El código del rechazo, venga del mock o del backend — o `null` si no es un
 * rechazo de negocio (bug, backend caído) y debe propagarse como error real.
 * Mismo problema que resuelve `orderErrorStatus` en customer-app: los dos
 * datasources fallan distinto para lo MISMO, y la pantalla no debe notarlo.
 */
export function membershipErrorCode(e: unknown): MembershipErrorCode | null {
  if (e instanceof MembershipError) return e.code;
  if (e instanceof ApiRequestError && e.code && CODES.includes(e.code)) {
    return e.code as MembershipErrorCode;
  }
  return null;
}
