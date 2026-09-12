import { ApiRequestError } from './datasources/http/client';
import { OrderValidationError } from './datasources/mock/user.mock';

/**
 * Status HTTP con el que `POST /api/orders` debe responder a un error de
 * `createOrder()`, o `null` si el error no es un rechazo de negocio (bug real,
 * backend caído) y debe propagarse como 500.
 *
 * Existe porque los dos datasources fallan distinto para el MISMO rechazo: el
 * mock tira `OrderValidationError`, el backend responde 400/404 y el cliente
 * HTTP lo envuelve en `ApiRequestError`. Sin esta traducción, el checkout
 * mostraría un error genérico en un modo y el correcto en el otro.
 */
export function orderErrorStatus(e: unknown): number | null {
  if (e instanceof OrderValidationError) return 400;
  if (e instanceof ApiRequestError && (e.status === 400 || e.status === 404)) return e.status;
  return null;
}
