import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type DrizzleDb = NodePgDatabase<Record<string, unknown>>;

export type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

export type DrizzleExecutor = DrizzleDb | DrizzleTx;
