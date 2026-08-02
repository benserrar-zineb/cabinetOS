import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../../shared/database/database.service';
import { auditEvents } from './schema';

// AuditEvent est scope par organisation ET en ecriture seule (append-only) :
// aucune fonction update/delete n existe volontairement.

export async function createAuditEvent(
  databaseService: DatabaseService,
  organizationId: string,
  data: { actorUserId?: string; action: string; targetType?: string; targetId?: string },
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [created] = await tx
      .insert(auditEvents)
      .values({ ...data, organizationId })
      .returning();
    return created;
  });
}

export async function findAuditEventsByOrganization(
  databaseService: DatabaseService,
  organizationId: string,
) {
  return databaseService.withOrganizationScope(organizationId, (tx) =>
    tx.select().from(auditEvents).where(eq(auditEvents.organizationId, organizationId)),
  );
}
