import type { SelfInvoiceStatus } from '@mucho-loco/types';

/** Cada cuánto se vuelve a pedir el ticket mientras la clave está en proceso. */
export const TICKET_POLL_MS = 3000;
/** Hasta cuándo: después se ofrece "Actualizar" a mano (SC-001 del spec 003). */
export const TICKET_POLL_LIMIT_MS = 90_000;

/** Cuándo volver a pedir el ticket, o `null` si ya no hace falta. */
export function nextPollDelay(status: SelfInvoiceStatus, elapsedMs: number): number | null {
  return status === 'pending' && elapsedMs < TICKET_POLL_LIMIT_MS ? TICKET_POLL_MS : null;
}
