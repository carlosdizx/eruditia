import { z } from 'zod';
import logLevelSchema from './log-level.schema';
import databaseSchema from './database.schema';
import observeSchema from './observe.schema';
import authSchema from './auth.schema';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']),
    PORT: z.coerce.number().int().positive(),
    LOG_LEVELS: z
      .string()
      .transform((value) =>
        value
          .split(',')
          .map((level) => level.trim())
          .filter(Boolean),
      )
      .pipe(z.array(logLevelSchema).min(1)),
  })
  .extend(databaseSchema.shape)
  .extend(observeSchema.shape)
  .extend(authSchema.shape);

type Env = z.infer<typeof envSchema>;

export default Env;
