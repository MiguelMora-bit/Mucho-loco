import { Module } from '@nestjs/common';
import { CounterMembershipsService } from './counter-memberships.service';
import { CounterMembershipsController, MembersController } from './counter-memberships.controller';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [ChargesModule],
  providers: [CounterMembershipsService],
  controllers: [CounterMembershipsController, MembersController],
  exports: [CounterMembershipsService],
})
export class CounterMembershipsModule {}
