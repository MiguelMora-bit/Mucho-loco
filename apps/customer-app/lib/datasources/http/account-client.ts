import { SESSION_COOKIE } from '../../auth';
import { createCustomerApi } from './client';
import { cookieSessionToken } from './session-token';

/**
 * Endpoints de cuenta (`/users/me`, `/community`, `/performance`,
 * `/payments`): mandan el ID token de la cookie httpOnly `ml_session`.
 *
 * SOLO servidor — Server Components de `(account)/` y Route Handlers de
 * `app/api/`, que es donde la cookie se puede leer. Por eso vive separado de
 * `publicApi`: un componente del navegador que importe un repositorio de
 * catálogo nunca debe llegar hasta aquí.
 */
export const accountApi = createCustomerApi({
  getToken: cookieSessionToken,
  missingTokenMessage: `Sin sesión (cookie ${SESSION_COOKIE}) — el middleware debió redirigir a /account antes de llegar aquí`,
});
