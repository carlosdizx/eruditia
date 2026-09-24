import { MigrationFn } from 'umzug';
import { eq } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { hashPassword } from 'better-auth/crypto';
import { DrizzleDb } from '@database/types/drizzle.types';
import { account, user } from '@database/schema';
import superAdminEnvSchema from '@common/schemas/super-admin-env.schema';
import SystemRole from '@auth/enums/system-role.enum';

// Public sign-up is disabled, so the first super admin can't register
// through the API — it's inserted here exactly as Better Auth's
// email/password flow would store it (user + "credential" account holding
// the scrypt hash).

export const up: MigrationFn<DrizzleDb> = async ({ context: db }) => {
  const env = superAdminEnvSchema.parse(process.env);
  const password = await hashPassword(env.SUPER_ADMIN_PASSWORD);

  await db.transaction(async (tx) => {
    const userId = generateId();

    await tx.insert(user).values({
      id: userId,
      name: env.SUPER_ADMIN_NAME,
      email: env.SUPER_ADMIN_EMAIL.toLowerCase(),
      emailVerified: true,
      role: SystemRole.SUPER_ADMIN,
    });

    await tx.insert(account).values({
      id: generateId(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password,
    });
  });
};

export const down: MigrationFn<DrizzleDb> = async ({ context: db }) => {
  const env = superAdminEnvSchema.parse(process.env);

  await db.transaction(async (tx) => {
    // Accounts and sessions are removed by the user's ON DELETE CASCADE.
    await tx
      .delete(user)
      .where(eq(user.email, env.SUPER_ADMIN_EMAIL.toLowerCase()));
  });
};
