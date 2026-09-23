import * as dotenv from 'dotenv';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { envSchema } from '@common/schemas/env.schema';
import createDrizzleConnection from '@database/config/database-connection.factory';
import * as schema from '@database/schema';

dotenv.config();

const env = envSchema.parse(process.env);

const db = createDrizzleConnection(env);

const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.TRUSTED_ORIGINS,
  emailAndPassword: { enabled: true, autoSignIn: true },
});

export default auth;
