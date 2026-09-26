import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.provider';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { MembershipBillingService } from './membership-billing.service';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [UsersModule, NotificationsModule, MembershipsModule, ChargesModule],
  providers: [PaymentsService, MembershipBillingService, StripeService],
  controllers: [PaymentsController],
  exports: [PaymentsService, StripeService, MembershipBillingService],
})
export class PaymentsModule {}
