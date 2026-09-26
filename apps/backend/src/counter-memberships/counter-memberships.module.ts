import { Module } from '@nestjs/common';
import { CounterMembershipsService } from './counter-memberships.service';
import { CounterMembershipsController, MembersController } from './counter-memberships.controller';
import { ChargesModule } from '../charges/charges.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [ChargesModule, PaymentsModule],
  providers: [CounterMembershipsService],
  controllers: [CounterMembershipsController, MembersController],
  exports: [CounterMembershipsService],
})
export class CounterMembershipsModule {}
