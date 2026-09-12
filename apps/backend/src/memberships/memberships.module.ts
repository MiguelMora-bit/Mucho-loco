import { Module } from '@nestjs/common';
import { MembershipTiersController } from './membership-tiers.controller';
import { MembershipsService } from './memberships.service';

@Module({
  controllers: [MembershipTiersController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
