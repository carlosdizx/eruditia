'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { GRADE_LEVEL_GRANTS } from '@/lib/auth/permissions';
import type {
  GradeLevelActionResult,
  GradeLevelFormState,
  GradeLevelFormValues,
} from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): GradeLevelFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim()]),
  );

const toBody = ({
  name,
  shortName,
  sequenceOrder,
  isFinalGrade,
}: GradeLevelFormValues) => ({
  name,
  shortName,
  sequenceOrder: Number(sequenceOrder),
  isFinalGrade: isFinalGrade === 'on',
});

export async function createGradeLevel(
  _prev: GradeLevelFormState,
  formData: FormData,
): Promise<GradeLevelFormState> {
  await requireGrant(GRADE_LEVEL_GRANTS.create);

  const values = readValues(formData);

  try {
    await authFetch('/grade-levels', { method: 'POST', body: toBody(values) });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: `Se creó el grado ${values.name}` };
}

export async function updateGradeLevel(
  gradeLevelId: string,
  _prev: GradeLevelFormState,
  formData: FormData,
): Promise<GradeLevelFormState> {
  await requireGrant(GRADE_LEVEL_GRANTS.update);

  const values = readValues(formData);

  try {
    await authFetch(`/grade-levels/${gradeLevelId}`, {
      method: 'PATCH',
      body: toBody(values),
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: `Se actualizó el grado ${values.name}` };
}

export async function deleteGradeLevel(
  gradeLevelId: string,
): Promise<GradeLevelActionResult> {
  await requireGrant(GRADE_LEVEL_GRANTS.delete);

  try {
    await authFetch(`/grade-levels/${gradeLevelId}`, { method: 'DELETE' });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true, message: 'Se eliminó el grado' };
}

export async function loadStandardGradeLevels(): Promise<GradeLevelActionResult> {
  await requireGrant(GRADE_LEVEL_GRANTS.create);

  let created: number, skipped: number;
  try {
    ({ created, skipped } = await authFetch<{
      created: number;
      skipped: number;
    }>('/grade-levels/standard', { method: 'POST' }));
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  if (created) refresh();
  return {
    ok: true,
    message: created
      ? `Se crearon ${created} grados${skipped ? ` (${skipped} ya existían)` : ''}`
      : 'Ya tienes todos los grados de la plantilla',
  };
}
