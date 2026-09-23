import { PoolConfig } from 'pg';
import DatabaseEnvInterface from '@database/interfaces/database-env.interface';

const databaseOptionsUtil = (env: DatabaseEnvInterface): PoolConfig => {
  return {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  };
};

export default databaseOptionsUtil;
