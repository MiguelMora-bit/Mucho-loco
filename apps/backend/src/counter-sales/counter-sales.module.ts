import { Module } from '@nestjs/common';
import { CounterSalesService } from './counter-sales.service';
import { CounterSalesController } from './counter-sales.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [CounterSalesService],
  controllers: [CounterSalesController],
  exports: [CounterSalesService],
})
export class CounterSalesModule {}
