import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organizations } from '../../organization';
import { users } from '../../identity';

// AuditEvent est en ecriture seule (append-only) : pas de updatedAt, pas de deletedAt.
// Toute action sensible est capturee : qui (actorUserId), ou (organizationId), quoi (action, target).

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    actorUserId: text('actor_user_id').references(() => users.id),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('audit_events_organization_id_idx').on(table.organizationId)],
);
