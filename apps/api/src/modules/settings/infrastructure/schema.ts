import { pgTable, uuid, text, jsonb, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organizations } from '../../organization';

export const settings = pgTable(
  'settings',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    key: text('key').notNull(),
    value: jsonb('value'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('settings_organization_id_idx').on(table.organizationId),
    unique('settings_org_key_unique').on(table.organizationId, table.key),
  ],
);
