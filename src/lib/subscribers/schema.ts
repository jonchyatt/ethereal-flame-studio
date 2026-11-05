import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Mailing-list records. Email is normalized to lowercase before it reaches this table. */
export const subscribers = sqliteTable('subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  sourcePage: text('source_page').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  userAgent: text('user_agent'),
  // Kept ready for the unsubscribe link included in a future mailing provider.
  optinToken: text('optin_token'),
  unsubscribedAt: text('unsubscribed_at'),
}, (table) => [
  uniqueIndex('subscribers_email_unique').on(table.email),
  uniqueIndex('subscribers_optin_token_unique').on(table.optinToken),
  uniqueIndex('subscribers_created_at_idx').on(table.createdAt),
]);

export type Subscriber = typeof subscribers.$inferSelect;
