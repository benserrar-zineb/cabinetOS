import { sql } from 'drizzle-orm';
import type { DatabaseService } from '../../shared/database/database.service';

// TASK-016 : verifie qu un utilisateur, dans le contexte d une organisation donnee,
// possede bien la permission (action, resource) requise -- via la chaine
// Membership -> Role -> RolePermission -> Permission. Scope par organisation
// (withOrganizationScope), coherent avec EA-003.

export async function hasPermission(
  databaseService: DatabaseService,
  organizationId: string,
  userId: string,
  action: string,
  resource: string,
): Promise<boolean> {
  const result = await databaseService.withOrganizationScope(organizationId, (tx) =>
    tx.execute(sql`
      SELECT 1
      FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.user_id = ${userId}
        AND m.organization_id = ${organizationId}
        AND p.action = ${action}
        AND p.resource = ${resource}
      LIMIT 1
    `),
  );
  return result.rows.length > 0;
}
