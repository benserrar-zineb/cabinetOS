import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organizations } from '../../organization';

// Squelette uniquement (TASK-006) : entite presente au schema, aucune logique d upload
// ni de stockage reel. Stockage local en dev / objet compatible S3 en recette, a un Build ulterieur.

export const fileObjects = pgTable(
  'file_objects',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    hash: text('hash').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [index('file_objects_organization_id_idx').on(table.organizationId)],
);
