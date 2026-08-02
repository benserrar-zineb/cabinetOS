import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../../shared/database/database.service';
import { users } from './schema';

// User est global (pas de organizationId) : un utilisateur peut appartenir a plusieurs
// organisations via Membership. Ces fonctions ne sont donc pas scopees par organisation.

export async function findUserById(databaseService: DatabaseService, id: string) {
  const [user] = await databaseService.db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function updateUser(
  databaseService: DatabaseService,
  id: string,
  data: Partial<{ name: string; image: string | null }>,
) {
  const [updated] = await databaseService.db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return updated;
}

export async function softDeleteUser(databaseService: DatabaseService, id: string) {
  const [deleted] = await databaseService.db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return deleted;
}
