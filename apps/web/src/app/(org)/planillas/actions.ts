'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { GRADE_GRANTS } from '@/lib/auth/permissions';
import type { SubjectConcept } from '@/lib/grading/concepts';
import type {
  ConceptSource,
  ConceptsActionResult,
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

export async function setSubjectConcepts(
  classroomSubjectId: string,
  periodId: string,
  concepts: SubjectConcept[],
): Promise<ConceptsActionResult> {
  await requireGrant(GRADE_GRANTS.record);

  let saved: Required<SubjectConcept>[];
  try {
    saved = await authFetch<Required<SubjectConcept>[]>(
      `${gradebookPath(classroomSubjectId, periodId)}/concepts`,
      {
        method: 'PUT',
        body: {
          concepts: concepts.map(({ minScore, maxScore, conceptText }) => ({
            minScore,
            maxScore,
            conceptText,
          })),
        },
      },
    );
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return {
    ok: true,
    message: saved.length
      ? 'Se guardaron los conceptos del periodo'
      : 'Se quitaron los conceptos del periodo',
    concepts: saved,
  };
}

export async function getConceptSources(
  classroomSubjectId: string,
): Promise<
  { ok: true; sources: ConceptSource[] } | { ok: false; message: string }
> {
  await requireGrant(GRADE_GRANTS.record);

  try {
    return {
      ok: true,
      sources: await authFetch<ConceptSource[]>(
        `/gradebooks/${classroomSubjectId}/concept-sources`,
      ),
    };
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }
}
