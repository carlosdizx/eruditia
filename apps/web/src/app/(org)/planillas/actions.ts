'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { GRADE_GRANTS } from '@/lib/auth/permissions';
import type {
  EvaluationItemPayload,
  Gradebook,
  GradebookActionResult,
  StudentGradesPayload,
} from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const gradebookPath = (classroomSubjectId: string, periodId: string) =>
  `/gradebooks/${classroomSubjectId}/periods/${periodId}`;

export async function saveGrades(
  classroomSubjectId: string,
  periodId: string,
  students: StudentGradesPayload[],
): Promise<GradebookActionResult> {
  await requireGrant(GRADE_GRANTS.record);

  let gradebook: Gradebook;
  try {
    gradebook = await authFetch<Gradebook>(
      `${gradebookPath(classroomSubjectId, periodId)}/grades`,
      { method: 'PUT', body: { students } },
    );
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return {
    ok: true,
    message:
      students.length === 1
        ? 'Se guardaron las notas de 1 estudiante'
        : `Se guardaron las notas de ${students.length} estudiantes`,
    gradebook,
  };
}

export async function setEvaluationItems(
  classroomSubjectId: string,
  periodId: string,
  items: EvaluationItemPayload[],
): Promise<GradebookActionResult> {
  await requireGrant(GRADE_GRANTS.record);

  let gradebook: Gradebook;
  try {
    gradebook = await authFetch<Gradebook>(
      `${gradebookPath(classroomSubjectId, periodId)}/items`,
      { method: 'PUT', body: { items } },
    );
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true, message: 'Se actualizaron las actividades', gradebook };
}
