import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../../shared/database/database.service';
import { permissions } from './schema';

// Permission est global, structure en action + ressource (decision du Decision Gate).

export async function findAllPermissions(databaseService: DatabaseService) {
  return databaseService.db.select().from(permissions);
}

export async function findPermissionById(databaseService: DatabaseService, id: string) {
  const [permission] = await databaseService.db
    .select()
    .from(permissions)
    .where(eq(permissions.id, id));
  return permission;
}
