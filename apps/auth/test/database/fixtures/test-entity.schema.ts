import { pgTable, text } from 'drizzle-orm/pg-core';
import { baseColumns } from '@database/schema/base-columns';

export const testEntitiesTable = pgTable('test_entities', {
  ...baseColumns,
  name: text('name'),
});

export type TestEntitySelect = typeof testEntitiesTable.$inferSelect;
export type TestEntityInsert = typeof testEntitiesTable.$inferInsert;
