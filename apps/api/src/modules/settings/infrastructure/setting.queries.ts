import { and, eq } from 'drizzle-orm';
import type { DatabaseService } from '../../shared/database/database.service';
import { settings } from './schema';

// Setting est scope par organisation. Cle-valeur : upsertSetting remplace la valeur
// existante ou en cree une nouvelle, toujours dans le contexte de l organisation active.

export async function upsertSetting(
  databaseService: DatabaseService,
  organizationId: string,
  key: string,
  value: unknown,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(settings)
      .where(and(eq(settings.organizationId, organizationId), eq(settings.key, key)));

    if (existing) {
      const [updated] = await tx
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await tx.insert(settings).values({ organizationId, key, value }).returning();
    return created;
  });
}

export async function findSettingByKey(
  databaseService: DatabaseService,
  organizationId: string,
  key: string,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [setting] = await tx
      .select()
      .from(settings)
      .where(and(eq(settings.organizationId, organizationId), eq(settings.key, key)));
    return setting;
  });
}

export async function findAllSettings(databaseService: DatabaseService, organizationId: string) {
  return databaseService.withOrganizationScope(organizationId, (tx) =>
    tx.select().from(settings).where(eq(settings.organizationId, organizationId)),
  );
}

export async function deleteSetting(
  databaseService: DatabaseService,
  organizationId: string,
  key: string,
) {
  return databaseService.withOrganizationScope(organizationId, (tx) =>
    tx
      .delete(settings)
      .where(and(eq(settings.organizationId, organizationId), eq(settings.key, key))),
  );
}
