export { NotificationsModule } from './notifications.module';
export { notifications, notificationStatusEnum } from './infrastructure/schema';
export type { NotificationChannel, NotificationPayload } from './domain/notification-channel.port';
export {
  createNotification,
  findNotificationsByUser,
  markNotificationRead,
} from './infrastructure/notification.queries';
