import Env, { envSchema } from '@common/schemas/env.schema';

const validateEnv = (config: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
};

export default validateEnv;
