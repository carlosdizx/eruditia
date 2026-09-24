import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

// Tables of Better Auth's `organization()` plugin (better-auth@1.7.5, no
// teams, no dynamic access control). Like auth.schema.ts, the exported names
// (`organization`, `member`, `invitation`) are the keys the Drizzle adapter
// looks up, so they must stay exactly these.

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  // JSON string, e.g. {"features":["reports:advanced"]} — see
  // organization-metadata.schema.ts for its shape.
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const member = pgTable(
  'member',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Unique: a user belongs to exactly one organization (business rule).
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('member_organization_id_idx').on(table.organizationId)],
);

export const invitation = pgTable(
  'invitation',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role'),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('invitation_organization_id_idx').on(table.organizationId),
    index('invitation_email_idx').on(table.email),
  ],
);
