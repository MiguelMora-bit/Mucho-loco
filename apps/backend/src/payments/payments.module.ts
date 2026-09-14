import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.provider';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { MembershipBillingService } from './membership-billing.service';

@Module({
  imports: [UsersModule, NotificationsModule, MembershipsModule],
  providers: [PaymentsService, MembershipBillingService, StripeService],
  controllers: [PaymentsController],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
