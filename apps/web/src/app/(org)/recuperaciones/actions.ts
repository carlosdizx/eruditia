'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { RECOVERY_GRANTS } from '@/lib/auth/permissions';
import type { RecoveryActionResult } from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const recoveryPath = (classroomSubjectId: string, enrollmentId: string) =>
  `/recoveries/${classroomSubjectId}/students/${enrollmentId}`;

export async function saveRecovery(
  classroomSubjectId: string,
  enrollmentId: string,
  values: { score: number; notes: string },
): Promise<RecoveryActionResult> {
  await requireGrant(RECOVERY_GRANTS.manage);

  try {
    await authFetch(recoveryPath(classroomSubjectId, enrollmentId), {
      method: 'PUT',
      body: { score: values.score, notes: values.notes.trim() || null },
    });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true, message: 'Se guardó la recuperación' };
}

export async function deleteRecovery(
  classroomSubjectId: string,
  enrollmentId: string,
): Promise<RecoveryActionResult> {
  await requireGrant(RECOVERY_GRANTS.manage);

  try {
    await authFetch(recoveryPath(classroomSubjectId, enrollmentId), {
      method: 'DELETE',
    });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true, message: 'Se quitó la recuperación' };
}
