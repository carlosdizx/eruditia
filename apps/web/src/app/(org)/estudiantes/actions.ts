'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { STUDENT_GRANTS } from '@/lib/auth/permissions';
import type {
  StudentActionResult,
  StudentFormState,
  StudentFormValues,
  StudentsImportState,
  StudentsImportSummary,
  StudentStatus,
} from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): StudentFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim()]),
  );

const OPTIONAL_FIELDS = [
  'birthDate',
  'guardianName',
  'guardianPhone',
  'guardianEmail',
] as const;

export async function createStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireGrant(STUDENT_GRANTS.create);

  const values = readValues(formData);
  const {
    firstName,
    lastName,
    documentType,
    documentNumber,
    studentCode,
    createAccount,
    email,
  } = values;
  const withAccount = createAccount === 'on';

  try {
    await authFetch('/students', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        documentType,
        documentNumber,
        ...(studentCode && { studentCode }),
        ...(withAccount && { createAccount: true, email }),
        // Los vacíos no se envían.
        ...Object.fromEntries(
          OPTIONAL_FIELDS.filter((field) => values[field]).map((field) => [
            field,
            values[field],
          ]),
        ),
      },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return {
    status: 'success',
    message: withAccount
      ? `Se matriculó a ${firstName} ${lastName}. Si su cuenta es nueva, le enviamos la contraseña temporal a ${email}.`
      : `Se matriculó a ${firstName} ${lastName}`,
  };
}

export async function updateStudent(
  studentId: string,
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireGrant(STUDENT_GRANTS.update);

  const values = readValues(formData);
  const {
    firstName,
    lastName,
    documentType,
    documentNumber,
    studentCode,
    status,
  } = values;

  try {
    await authFetch(`/students/${studentId}`, {
      method: 'PATCH',
      body: {
        firstName,
        lastName,
        documentType,
        documentNumber,
        status,
        // Vacío conserva el código actual.
        ...(studentCode && { studentCode }),
        // Vacío borra el dato.
        ...Object.fromEntries(
          OPTIONAL_FIELDS.map((field) => [field, values[field] || null]),
        ),
      },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: `Se actualizó a ${firstName}` };
}

export async function changeStudentStatus(
  studentId: string,
  status: StudentStatus,
): Promise<StudentActionResult> {
  await requireGrant(STUDENT_GRANTS.update);

  try {
    await authFetch(`/students/${studentId}`, {
      method: 'PATCH',
      body: { status },
    });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true };
}

export async function importStudents(
  _prev: StudentsImportState,
  formData: FormData,
): Promise<StudentsImportState> {
  await requireGrant(STUDENT_GRANTS.import);

  const file = formData.get('file');
  if (!(file instanceof File) || !file.size)
    return { status: 'error', message: 'Selecciona un archivo CSV' };

  const body = new FormData();
  body.append('file', file);

  let summary: StudentsImportSummary;
  try {
    summary = await authFetch<StudentsImportSummary>('/students/import', {
      method: 'POST',
      body,
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error) };
  }

  if (summary.created) refresh();
  return { status: 'done', summary };
}

// La cuenta queda desactivada; el estudiante sigue en el portal público.
export async function unlinkStudentAccount(
  studentId: string,
): Promise<StudentActionResult> {
  await requireGrant(STUDENT_GRANTS.update);

  try {
    await authFetch(`/students/${studentId}/account`, { method: 'DELETE' });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true };
}

export async function linkStudentAccount(
  studentId: string,
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireGrant(STUDENT_GRANTS.update);

  const values = readValues(formData);

  try {
    await authFetch(`/students/${studentId}/account`, {
      method: 'POST',
      body: { email: values.email },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return {
    status: 'success',
    message: `Se vinculó la cuenta ${values.email}. Si es nueva, le enviamos la contraseña temporal.`,
  };
}
