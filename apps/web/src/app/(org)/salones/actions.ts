'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { CLASSROOM_GRANTS } from '@/lib/auth/permissions';
import {
  NO_TEACHER,
  type ClassroomActionResult,
  type ClassroomFormState,
  type ClassroomFormValues,
} from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): ClassroomFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim()]),
  );

// Vacíos (sin director, sin cupo) se envían como null.
const toBody = ({
  gradeLevelId,
  name,
  homeroomTeacherId,
  capacity,
}: ClassroomFormValues) => ({
  gradeLevelId,
  name,
  homeroomTeacherId:
    homeroomTeacherId && homeroomTeacherId !== NO_TEACHER
      ? homeroomTeacherId
      : null,
  capacity: capacity ? Number(capacity) : null,
});

export async function createClassroom(
  academicYearId: string,
  _prev: ClassroomFormState,
  formData: FormData,
): Promise<ClassroomFormState> {
  await requireGrant(CLASSROOM_GRANTS.create);

  const values = readValues(formData);
  const { homeroomTeacherId, capacity, ...body } = toBody(values);

  try {
    await authFetch('/classrooms', {
      method: 'POST',
      body: {
        ...body,
        academicYearId,
        // En el alta los opcionales se omiten en lugar de enviarse en null.
        ...(homeroomTeacherId && { homeroomTeacherId }),
        ...(capacity && { capacity }),
      },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: `Se creó el salón ${values.name}` };
}

export async function updateClassroom(
  classroomId: string,
  _prev: ClassroomFormState,
  formData: FormData,
): Promise<ClassroomFormState> {
  await requireGrant(CLASSROOM_GRANTS.update);

  const values = readValues(formData);

  try {
    await authFetch(`/classrooms/${classroomId}`, {
      method: 'PATCH',
      body: toBody(values),
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: `Se actualizó el salón ${values.name}` };
}

export async function deleteClassroom(
  classroomId: string,
): Promise<ClassroomActionResult> {
  await requireGrant(CLASSROOM_GRANTS.delete);

  try {
    await authFetch(`/classrooms/${classroomId}`, { method: 'DELETE' });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true };
}
