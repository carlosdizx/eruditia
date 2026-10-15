'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { CLASSROOM_SUBJECT_GRANTS } from '@/lib/auth/permissions';
import { NO_TEACHER } from '../types';
import type {
  AssignmentActionResult,
  AssignmentFormState,
  AssignmentFormValues,
} from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): AssignmentFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim()]),
  );

// Vacíos (sin docente, sin horas) se envían como null.
const toBody = ({
  teacherId,
  weeklyHours,
  weightInGpa,
}: AssignmentFormValues) => ({
  teacherId: teacherId && teacherId !== NO_TEACHER ? teacherId : null,
  weeklyHours: weeklyHours ? Number(weeklyHours) : null,
  weightInGpa: weightInGpa ? Number(weightInGpa) : 1,
});

export async function assignSubject(
  classroomId: string,
  _prev: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  await requireGrant(CLASSROOM_SUBJECT_GRANTS.assign);

  const values = readValues(formData);
  const { teacherId, weeklyHours, weightInGpa } = toBody(values);

  try {
    await authFetch(`/classrooms/${classroomId}/subjects`, {
      method: 'POST',
      body: {
        subjectId: values.subjectId,
        weightInGpa,
        // En el alta los opcionales se omiten en lugar de enviarse en null.
        ...(teacherId && { teacherId }),
        ...(weeklyHours && { weeklyHours }),
      },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: 'Se asignó la materia al salón' };
}

export async function updateAssignment(
  classroomId: string,
  assignmentId: string,
  _prev: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  await requireGrant(CLASSROOM_SUBJECT_GRANTS.assign);

  const values = readValues(formData);

  try {
    await authFetch(`/classrooms/${classroomId}/subjects/${assignmentId}`, {
      method: 'PATCH',
      body: toBody(values),
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: 'Se actualizó la materia del salón' };
}

export async function removeAssignment(
  classroomId: string,
  assignmentId: string,
): Promise<AssignmentActionResult> {
  await requireGrant(CLASSROOM_SUBJECT_GRANTS.assign);

  try {
    await authFetch(`/classrooms/${classroomId}/subjects/${assignmentId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true };
}
