import { Module } from '@nestjs/common';
import { PickupOrdersService } from './pickup-orders.service';
import { PickupOrdersController } from './pickup-orders.controller';

@Module({
  providers: [PickupOrdersService],
  controllers: [PickupOrdersController],
  exports: [PickupOrdersService],
})
export class PickupOrdersModule {}
