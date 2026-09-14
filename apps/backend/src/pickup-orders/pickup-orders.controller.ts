import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import type { PickupOrder } from '@mucho-loco/types';
import { PickupOrdersService } from './pickup-orders.service';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class PickupOrdersController {
  constructor(private pickupOrders: PickupOrdersService) {}

  @Roles('staff')
  @Get('branches/:branchId/pickup-orders')
  getByBranch(@Param('branchId', ParseIntPipe) branchId: number): Promise<PickupOrder[]> {
    return this.pickupOrders.getByBranch(branchId);
  }

  @Roles('staff')
  @Post('pickup-orders/:orderId/deliver')
  markDelivered(@Param('orderId') orderId: string): Promise<PickupOrder> {
    return this.pickupOrders.markDelivered(orderId);
  }
}
