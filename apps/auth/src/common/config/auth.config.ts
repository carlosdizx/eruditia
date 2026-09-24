import * as dotenv from 'dotenv';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { envSchema } from '@common/schemas/env.schema';
import createDrizzleConnection from '@database/config/database-connection.factory';
import * as schema from '@database/schema';
import adminPlugin from '@auth/plugins/admin.plugin';
import organizationPlugin from '@auth/plugins/organization.plugin';
import assignActiveOrganizationHook from '@auth/hooks/assign-active-organization.hook';

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
  // No public sign-up: users are created by the super admin (organization
  // admins) or by an organization admin (employees), server-side.
  emailAndPassword: { enabled: true, disableSignUp: true },
  databaseHooks: {
    session: { create: { before: assignActiveOrganizationHook(db) } },
  },
  plugins: [adminPlugin(), organizationPlugin(db)],
});

export type Auth = typeof auth;

export default auth;
