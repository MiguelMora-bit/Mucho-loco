import type { CounterTicket } from '@mucho-loco/types';
import { TicketMockDatasource } from '../datasources/mock/ticket.mock';
import { TicketHttpDatasource } from '../datasources/http/ticket.http';
import { isHttpDatasourceEnabled } from '../datasources/http/config';
import type { TicketKind } from './ticket.errors';

export { TicketNotFoundError, type TicketKind } from './ticket.errors';

/**
 * El ticket de un cobro de mostrador con su clave de autofactura (spec 003).
 * La clave la crea el backend en segundo plano: se pide después del cobro, y
 * se vuelve a pedir mientras esté "en proceso" (ver `lib/ticketPolling.ts`).
 */
export interface ITicketRepository {
  getTicket(kind: TicketKind, sourceId: string, branchId: number): Promise<CounterTicket>;
}

// Mock o backend NestJS real, según VITE_DATA_SOURCE — ver datasources/http/config.ts.
export const ticketRepository: ITicketRepository = isHttpDatasourceEnabled()
  ? new TicketHttpDatasource()
  : new TicketMockDatasource();
