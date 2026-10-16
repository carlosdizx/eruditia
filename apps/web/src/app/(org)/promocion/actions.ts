'use server';

import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { ENROLLMENT_GRANTS } from '@/lib/auth/permissions';
import type { PromotionDecision, PromotionResult } from './types';

// No refresca la página: el asistente muestra el resultado y el usuario decide
// cuándo volver a la revisión.
export async function promoteStudents(body: {
  sourceClassroomId: string;
  targetAcademicYearId: string;
  enrollmentDate: string;
  decisions: PromotionDecision[];
}): Promise<PromotionResult> {
  await requireGrant(ENROLLMENT_GRANTS.promote);

  try {
    const result = await authFetch<{
      promoted: number;
      repeated: number;
      graduated: number;
    }>('/promotions', { method: 'POST', body });
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : 'Ocurrió un error inesperado',
    };
  }
}
