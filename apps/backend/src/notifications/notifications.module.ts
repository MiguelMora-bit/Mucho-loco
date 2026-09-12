import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { WhatsAppService } from './whatsapp.provider';

@Module({
  // forRoot() aquí y no en AppModule: el único cron del proyecto vive en este
  // módulo, así que el scheduler es una dependencia suya, no del app entero.
  imports: [ScheduleModule.forRoot()],
  providers: [NotificationsService, WhatsAppService],
  controllers: [NotificationsController],
  exports: [NotificationsService, WhatsAppService],
})
export class NotificationsModule {}
