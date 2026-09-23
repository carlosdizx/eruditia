import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import DatabaseEnvInterface from '@database/interfaces/database-env.interface';
import { DrizzleDb } from '@database/types/drizzle.types';
import databaseOptionsUtil from '@database/util/database-options.util';
import * as schema from '@database/schema';

const createDrizzleConnection = (env: DatabaseEnvInterface): DrizzleDb => {
  const pool = new Pool(databaseOptionsUtil(env));

  return drizzle(pool, { schema, logger: env.DB_LOGGING });
};

export default createDrizzleConnection;
