import { Module } from '@nestjs/common';
import { CounterMembershipsService } from './counter-memberships.service';
import {
  AccessAlertsController,
  CounterMembershipsController,
  MembersController,
} from './counter-memberships.controller';
import { ChargesModule } from '../charges/charges.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [ChargesModule, PaymentsModule],
  providers: [CounterMembershipsService],
  controllers: [CounterMembershipsController, MembersController, AccessAlertsController],
  exports: [CounterMembershipsService],
})
export class CounterMembershipsModule {}
