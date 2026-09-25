import type { CounterTicket } from '@mucho-loco/types';
import type { ITicketRepository } from '../../repositories/ticket.repository';
import { TicketNotFoundError, type TicketKind } from '../../repositories/ticket.errors';
import { api, ApiRequestError } from './client';

export class TicketHttpDatasource implements ITicketRepository {
  async getTicket(kind: TicketKind, sourceId: string, branchId: number): Promise<CounterTicket> {
    try {
      return await api.get<CounterTicket>(
        `/branches/${branchId}/tickets/${kind}/${encodeURIComponent(sourceId)}`,
      );
    } catch (e) {
      // Solo el "no existe" se traduce; un backend caído no es un ticket inexistente.
      if (e instanceof ApiRequestError && e.code === 'TICKET_NOT_FOUND') {
        throw new TicketNotFoundError(kind, sourceId);
      }
      throw e;
    }
  }
}
