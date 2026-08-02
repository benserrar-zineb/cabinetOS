import { and, eq } from 'drizzle-orm';
import type { DatabaseService } from '../../shared/database/database.service';
import { notifications } from './schema';

// Notification est scope par organisation.

export async function createNotification(
  databaseService: DatabaseService,
  organizationId: string,
  data: { userId: string; channel: string; title: string; body?: string },
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [created] = await tx
      .insert(notifications)
      .values({ ...data, organizationId })
      .returning();
    return created;
  });
}

export async function findNotificationsByUser(
  databaseService: DatabaseService,
  organizationId: string,
  userId: string,
) {
  return databaseService.withOrganizationScope(organizationId, (tx) =>
    tx
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.organizationId, organizationId), eq(notifications.userId, userId)),
      ),
  );
}

export async function markNotificationRead(
  databaseService: DatabaseService,
  organizationId: string,
  notificationId: string,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [updated] = await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.id, notificationId), eq(notifications.organizationId, organizationId)),
      )
      .returning();
    return updated;
  });
}
