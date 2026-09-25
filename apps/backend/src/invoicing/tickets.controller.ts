import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';
import type { CounterTicket } from '@mucho-loco/types';
import { Roles } from '../auth/roles.decorator';
import { TicketsService } from './tickets.service';

const KINDS = { sale: 'sale', membership: 'membership' } as const;

/** Ticket de un cobro de mostrador, con su clave de autofactura. */
@Controller('branches/:branchId/tickets')
export class TicketsController {
  constructor(private tickets: TicketsService) {}

  @Roles('staff')
  @Get(':kind/:sourceId')
  getTicket(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Param('kind', new ParseEnumPipe(KINDS)) kind: CounterTicket['kind'],
    @Param('sourceId') sourceId: string,
  ): Promise<CounterTicket> {
    return this.tickets.getTicket(branchId, kind, sourceId);
  }
}
