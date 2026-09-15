import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FacturapiService } from './facturapi.provider';
import { FiscalReceiptsService } from './fiscal-receipts.service';
import { InvoicingService } from './invoicing.service';
import { InvoicingController } from './invoicing.controller';
import { MemberInvoicingController } from './member-invoicing.controller';

/**
 * Facturación CFDI 4.0 vía Facturapi — paso 2, sobre el registro de cobros
 * del paso 1. Ver "Facturación CFDI" en apps/backend/CLAUDE.md.
 *
 * El cron del worker usa el ScheduleModule que ya registra NotificationsModule.
 */
@Module({
  imports: [UsersModule],
  providers: [FacturapiService, FiscalReceiptsService, InvoicingService],
  controllers: [MemberInvoicingController, InvoicingController],
})
export class InvoicingModule {}
