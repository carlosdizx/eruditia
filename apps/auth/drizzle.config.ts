import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import databaseSchema from './src/common/schemas/database.schema';

const env = databaseSchema.parse(process.env);

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: false,
  },
});
