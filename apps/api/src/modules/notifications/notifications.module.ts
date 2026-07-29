import { Module } from '@nestjs/common';
import { NotificationsController } from './presentation/notifications.controller';
import { InAppNotificationChannel } from './infrastructure/in-app-notification.channel';

@Module({
  controllers: [NotificationsController],
  providers: [InAppNotificationChannel],
})
export class NotificationsModule {}
