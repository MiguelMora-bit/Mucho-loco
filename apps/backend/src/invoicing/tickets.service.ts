import { Injectable, NotFoundException } from '@nestjs/common';
import type { CounterTicket } from '@mucho-loco/types';
import { PrismaService } from '../prisma/prisma.service';
import { ticketNotFound } from '../common/error-codes';
import { FacturapiService } from './facturapi.provider';
import { toCounterTicket } from './fiscal-mapping';

/**
 * El ticket que mostrador le da al cliente: el cobro tal como quedó
 * registrado, más su clave de autofactura. El recibo lo da de alta el worker
 * en segundo plano, así que el ticket se pide (y se vuelve a pedir) después
 * del cobro — ver specs/003-counter-self-invoice-ticket.
 */
@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private facturapi: FacturapiService,
  ) {}

  async getTicket(
    branchId: number,
    kind: CounterTicket['kind'],
    sourceId: string,
  ): Promise<CounterTicket> {
    const charge = await this.prisma.charge.findFirst({
      where: {
        // Solo la sucursal que cobró: uno de otra responde igual que uno que no existe.
        branchId,
        ...(kind === 'sale'
          ? { counterSaleId: sourceId }
          : { membershipPaymentId: sourceId }),
      },
      include: { lines: true, fiscalReceipt: true, branch: true },
    });
    if (!charge) throw new NotFoundException(ticketNotFound(kind, sourceId));
    return toCounterTicket(charge, kind, sourceId, this.facturapi.configured);
  }
}
