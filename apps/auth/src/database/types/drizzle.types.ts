import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgColumn, PgTable } from 'drizzle-orm/pg-core';

export type DrizzleDb = NodePgDatabase<Record<string, unknown>>;

export type DrizzleTx = Parameters<
  Parameters<DrizzleDb['transaction']>[0]
>[0];

export type DrizzleExecutor = DrizzleDb | DrizzleTx;

// Every table a repository can be built on must extend baseColumns
// (id/createdAt/updatedAt/deletedAt) — same rule as BaseModel before.
export type BaseTable = PgTable & {
  id: PgColumn;
  createdAt: PgColumn;
  updatedAt: PgColumn;
  deletedAt: PgColumn;
};
