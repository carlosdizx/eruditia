import { z } from 'zod';

// Only read by the create_super_admin seed, not by the app — so these are
// not part of envSchema and the app starts without them.
const superAdminEnvSchema = z.object({
  SUPER_ADMIN_NAME: z.string().min(1).default('Super Admin'),
  SUPER_ADMIN_EMAIL: z.email(),
  SUPER_ADMIN_PASSWORD: z.string().min(8),
});

export default superAdminEnvSchema;
