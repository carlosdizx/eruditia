import { z } from 'zod';

const observeSchema = z.object({
  OBSERVE_APP_KEY: z.string().min(1),
  OBSERVE_APP_SECRET: z.string().min(1),
  OBSERVE_SERVICE_ID: z.string().min(1),
});

export default observeSchema;
