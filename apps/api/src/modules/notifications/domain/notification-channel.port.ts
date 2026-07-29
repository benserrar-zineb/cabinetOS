// Interface generique du systeme d adaptateurs (Section K).
// Chaque canal (in-app, email, sms, push, whatsapp) implemente ce contrat.
// Seul l adaptateur in-app est actif en BUILD-001 ; les autres restent a l etat d interface.

export interface NotificationPayload {
  userId: string;
  title: string;
  body?: string;
}

export interface NotificationChannel {
  readonly name: string;
  send(payload: NotificationPayload): Promise<void>;
}
