import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../../shared/database/database.service';
import { organizations } from './schema';

// Organization EST l unite d isolation elle-meme : elle n est pas scopee PAR une
// organisation. Ces fonctions utilisent la connexion directe, pas withOrganizationScope.

export async function createOrganization(
  databaseService: DatabaseService,
  data: { name: string; slug: string },
) {
  const [created] = await databaseService.db.insert(organizations).values(data).returning();
  return created;
}

export async function findOrganizationById(databaseService: DatabaseService, id: string) {
  const [org] = await databaseService.db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id));
  return org;
}

export async function updateOrganization(
  databaseService: DatabaseService,
  id: string,
  data: Partial<{ name: string; slug: string }>,
) {
  const [updated] = await databaseService.db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();
  return updated;
}

export async function softDeleteOrganization(databaseService: DatabaseService, id: string) {
  const [deleted] = await databaseService.db
    .update(organizations)
    .set({ deletedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();
  return deleted;
}
