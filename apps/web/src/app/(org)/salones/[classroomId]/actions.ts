'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import {
  CLASSROOM_SUBJECT_GRANTS,
  ENROLLMENT_GRANTS,
} from '@/lib/auth/permissions';
import { NO_TEACHER } from '../types';
import type {
  AssignmentActionResult,
  AssignmentFormState,
  AssignmentFormValues,
  EnrollmentActionResult,
  EnrollmentStatus,
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

export async function enrollStudents(
  classroomId: string,
  studentIds: string[],
  enrollmentDate: string,
): Promise<EnrollmentActionResult> {
  await requireGrant(ENROLLMENT_GRANTS.create);

  let enrolled: number;
  try {
    ({ enrolled } = await authFetch<{ enrolled: number }>(
      `/classrooms/${classroomId}/enrollments`,
      { method: 'POST', body: { studentIds, enrollmentDate } },
    ));
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return {
    ok: true,
    message:
      enrolled === 1
        ? 'Se matriculó 1 estudiante'
        : `Se matricularon ${enrolled} estudiantes`,
  };
}

// Cambio de salón, retiro, traslado o reactivación.
export async function updateEnrollment(
  classroomId: string,
  enrollmentId: string,
  body: {
    classroomId?: string;
    status?: EnrollmentStatus;
    promotionNotes?: string | null;
  },
  message: string,
): Promise<EnrollmentActionResult> {
  await requireGrant(ENROLLMENT_GRANTS.update);

  try {
    await authFetch(`/classrooms/${classroomId}/enrollments/${enrollmentId}`, {
      method: 'PATCH',
      body,
    });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true, message };
}

export async function removeEnrollment(
  classroomId: string,
  enrollmentId: string,
): Promise<EnrollmentActionResult> {
  await requireGrant(ENROLLMENT_GRANTS.delete);

  try {
    await authFetch(`/classrooms/${classroomId}/enrollments/${enrollmentId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true, message: 'Se anuló la matrícula' };
}
