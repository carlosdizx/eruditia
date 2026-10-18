import { z } from 'zod';

const sessionSchema = z.object({
  // Vida máxima de una sesión desde el login, sin importar la actividad.
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  // Una sesión sin peticiones durante este tiempo deja de ser válida.
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(120),
});

export default sessionSchema;
