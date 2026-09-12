import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.provider';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [PaymentsService, StripeService],
  controllers: [PaymentsController],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
