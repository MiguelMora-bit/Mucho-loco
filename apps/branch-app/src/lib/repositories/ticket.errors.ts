import type { CounterTicket } from '@mucho-loco/types';

export type TicketKind = CounterTicket['kind'];

/** Mismo trato que el backend: un cobro de otra sucursal "no existe". */
export class TicketNotFoundError extends Error {
  readonly name = 'TicketNotFoundError';
  constructor(kind: TicketKind, sourceId: string) {
    super(`Ticket not found: ${kind}/${sourceId}`);
  }
}
