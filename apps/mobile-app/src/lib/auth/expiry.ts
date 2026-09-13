import type { Session } from './types';

/**
 * Cuánto antes de que venza el ID token se refresca. El token dura 60 min
 * (`id_token_validity` en infra/modules/cognito); refrescar con 5 min de
 * margen evita mandar al backend un token que vence a media request.
 */
export const REFRESH_MARGIN_MS = 5 * 60_000;

/** Una sesión sin `expiresAt` (guardada por una versión vieja del app) cuenta como vencida. */
export function needsRefresh(session: Pick<Session, 'expiresAt'>, now: number, marginMs = REFRESH_MARGIN_MS): boolean {
  return !session.expiresAt || session.expiresAt - now < marginMs;
}
