'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { SUBJECT_GRANTS } from '@/lib/auth/permissions';
import type {
  SubjectActionResult,
  SubjectFormState,
  SubjectFormValues,
} from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): SubjectFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim()]),
  );

export async function createSubject(
  _prev: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  await requireGrant(SUBJECT_GRANTS.create);

  const values = readValues(formData);
  const { name, code, areaName } = values;

  try {
    await authFetch('/subjects', {
      method: 'POST',
      body: { name, code, ...(areaName && { areaName }) },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: `Se creó la materia ${name}` };
}

export async function updateSubject(
  subjectId: string,
  _prev: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  await requireGrant(SUBJECT_GRANTS.update);

  const values = readValues(formData);
  const { name, code, areaName } = values;

  try {
    await authFetch(`/subjects/${subjectId}`, {
      method: 'PATCH',
      // Vacío quita el área.
      body: { name, code, areaName: areaName || null },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: `Se actualizó la materia ${name}` };
}

export async function deleteSubject(
  subjectId: string,
): Promise<SubjectActionResult> {
  await requireGrant(SUBJECT_GRANTS.delete);

  try {
    await authFetch(`/subjects/${subjectId}`, { method: 'DELETE' });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true, message: 'Se eliminó la materia' };
}

export async function loadStandardSubjects(): Promise<SubjectActionResult> {
  await requireGrant(SUBJECT_GRANTS.create);

  let created: number, skipped: number;
  try {
    ({ created, skipped } = await authFetch<{
      created: number;
      skipped: number;
    }>('/subjects/standard', { method: 'POST' }));
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  if (created) refresh();
  return {
    ok: true,
    message: created
      ? `Se crearon ${created} materias${skipped ? ` (${skipped} ya existían)` : ''}`
      : 'Ya tienes todas las materias base',
  };
}
