import { and, eq } from 'drizzle-orm';
import type { DatabaseService } from '../../shared/database/database.service';
import { memberships } from './schema';

// Membership porte organizationId : chaque fonction exige explicitement l organisation
// active et passe par withOrganizationScope -- aucun acces "par defaut" possible.

export async function createMembership(
  databaseService: DatabaseService,
  organizationId: string,
  data: { userId: string; roleId: string },
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [created] = await tx
      .insert(memberships)
      .values({ ...data, organizationId })
      .returning();
    return created;
  });
}

export async function findMembershipsByOrganization(
  databaseService: DatabaseService,
  organizationId: string,
) {
  return databaseService.withOrganizationScope(organizationId, (tx) =>
    tx.select().from(memberships).where(eq(memberships.organizationId, organizationId)),
  );
}

export async function updateMembershipRole(
  databaseService: DatabaseService,
  organizationId: string,
  membershipId: string,
  roleId: string,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [updated] = await tx
      .update(memberships)
      .set({ roleId })
      .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)))
      .returning();
    return updated;
  });
}

export async function deleteMembership(
  databaseService: DatabaseService,
  organizationId: string,
  membershipId: string,
) {
  return databaseService.withOrganizationScope(organizationId, (tx) =>
    tx
      .delete(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId))),
  );
}
