import { Module } from '@nestjs/common';
import { PickupOrdersService } from './pickup-orders.service';
import { PickupOrdersController } from './pickup-orders.controller';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [ChargesModule],
  providers: [PickupOrdersService],
  controllers: [PickupOrdersController],
  exports: [PickupOrdersService],
})
export class PickupOrdersModule {}
