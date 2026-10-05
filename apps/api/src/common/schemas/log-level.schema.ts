import { z } from 'zod';

const logLevelSchema = z.enum([
  'log',
  'error',
  'warn',
  'debug',
  'verbose',
  'fatal',
]);

export default logLevelSchema;
