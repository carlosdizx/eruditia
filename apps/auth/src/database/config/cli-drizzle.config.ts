import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import databaseSchema from '@common/schemas/database.schema';
import databaseOptionsUtil from '@database/util/database-options.util';
import { DrizzleDb } from '@database/types/drizzle.types';
import * as schema from '@database/schema';

dotenv.config();

interface CliDrizzle {
  db: DrizzleDb;
  pool: Pool;
}

const createCliDrizzle = (): CliDrizzle => {
  const env = databaseSchema.parse(process.env);
  const pool = new Pool(databaseOptionsUtil(env));

  return { db: drizzle(pool, { schema, logger: env.DB_LOGGING }), pool };
};

export default createCliDrizzle;
