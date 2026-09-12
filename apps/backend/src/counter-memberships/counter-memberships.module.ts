import { Module } from '@nestjs/common';
import { CounterMembershipsService } from './counter-memberships.service';
import { CounterMembershipsController } from './counter-memberships.controller';

@Module({
  providers: [CounterMembershipsService],
  controllers: [CounterMembershipsController],
  exports: [CounterMembershipsService],
})
export class CounterMembershipsModule {}
