import { Module } from '@nestjs/common';
import { CounterSalesService } from './counter-sales.service';
import { CounterSalesController } from './counter-sales.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [InventoryModule, ChargesModule],
  providers: [CounterSalesService],
  controllers: [CounterSalesController],
  exports: [CounterSalesService],
})
export class CounterSalesModule {}
