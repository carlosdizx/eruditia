import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { baseColumns } from './base-columns';

// Reference table showing the pattern — NOT re-exported from
// schema/index.ts, so drizzle-kit doesn't see it and no migration is
// generated for it. See src/database/README.md.
export const examplesTable = pgTable('examples', {
  ...baseColumns,
  title: text('title').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
});

export type ExampleSelect = typeof examplesTable.$inferSelect;
export type ExampleInsert = typeof examplesTable.$inferInsert;
