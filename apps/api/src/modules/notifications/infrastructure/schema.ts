import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organizations } from '../../organization';
import { users } from '../../identity';

export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'failed']);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    channel: text('channel').notNull(),
    status: notificationStatusEnum('status').notNull().default('pending'),
    title: text('title').notNull(),
    body: text('body'),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('notifications_organization_id_idx').on(table.organizationId),
    index('notifications_user_id_idx').on(table.userId),
  ],
);
