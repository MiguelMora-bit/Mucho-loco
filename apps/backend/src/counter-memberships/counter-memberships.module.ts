import { Module } from '@nestjs/common';
import { CounterMembershipsService } from './counter-memberships.service';
import { CounterMembershipsController, MembersController } from './counter-memberships.controller';

@Module({
  providers: [CounterMembershipsService],
  controllers: [CounterMembershipsController, MembersController],
  exports: [CounterMembershipsService],
})
export class CounterMembershipsModule {}
