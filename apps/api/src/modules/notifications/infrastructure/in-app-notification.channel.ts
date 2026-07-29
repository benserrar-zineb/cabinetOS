import { Injectable } from '@nestjs/common';
import type { NotificationChannel, NotificationPayload } from '../domain/notification-channel.port';

// Seul adaptateur actif en BUILD-001. Pas de logique d envoi reelle pour l instant
// (hors perimetre de TASK-006) : le cablage a la base de donnees arrive avec la logique metier.
@Injectable()
export class InAppNotificationChannel implements NotificationChannel {
  readonly name = 'in-app';

  async send(payload: NotificationPayload): Promise<void> {
    void payload;
  }
}
