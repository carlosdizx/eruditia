'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { ACADEMIC_YEAR_GRANTS } from '@/lib/auth/permissions';
import type {
  AcademicYearActionResult,
  AcademicYearFormState,
  AcademicYearFormValues,
  PeriodDraft,
} from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): AcademicYearFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim()]),
  );

// El editor de periodos envía sus filas como JSON en el campo "periods".
const readPeriods = (values: AcademicYearFormValues) =>
  (JSON.parse(values.periods || '[]') as PeriodDraft[]).map(
    ({ id, name, weightPercentage }) => ({
      ...(id && { id }),
      name: name.trim(),
      weightPercentage: Number(weightPercentage),
    }),
  );

const run = async (
  values: AcademicYearFormValues,
  request: () => Promise<unknown>,
  message: string,
): Promise<AcademicYearFormState> => {
  try {
    await request();
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message };
};

export async function createAcademicYear(
  _prev: AcademicYearFormState,
  formData: FormData,
): Promise<AcademicYearFormState> {
  await requireGrant(ACADEMIC_YEAR_GRANTS.create);

  const values = readValues(formData);
  const { name, startDate, endDate } = values;

  return run(
    values,
    () =>
      authFetch('/academic-years', {
        method: 'POST',
        body: { name, startDate, endDate, periods: readPeriods(values) },
      }),
    `Se creó el año lectivo ${name}`,
  );
}

export async function updateAcademicYear(
  yearId: string,
  _prev: AcademicYearFormState,
  formData: FormData,
): Promise<AcademicYearFormState> {
  await requireGrant(ACADEMIC_YEAR_GRANTS.update);

  const values = readValues(formData);
  const { name, startDate, endDate } = values;

  return run(
    values,
    () =>
      authFetch(`/academic-years/${yearId}`, {
        method: 'PATCH',
        body: { name, startDate, endDate },
      }),
    `Se actualizó el año lectivo ${name}`,
  );
}

export async function setAcademicPeriods(
  yearId: string,
  _prev: AcademicYearFormState,
  formData: FormData,
): Promise<AcademicYearFormState> {
  await requireGrant(ACADEMIC_YEAR_GRANTS.update);

  const values = readValues(formData);

  return run(
    values,
    () =>
      authFetch(`/academic-years/${yearId}/periods`, {
        method: 'PUT',
        body: { periods: readPeriods(values) },
      }),
    'Se guardaron los periodos',
  );
}

const simpleAction = async (
  request: () => Promise<unknown>,
): Promise<AcademicYearActionResult> => {
  try {
    await request();
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true };
};

export async function activateAcademicYear(yearId: string) {
  await requireGrant(ACADEMIC_YEAR_GRANTS.update);
  return simpleAction(() =>
    authFetch(`/academic-years/${yearId}/activate`, { method: 'POST' }),
  );
}

// Cerrar también cierra el ingreso de notas de todos sus periodos.
export async function setAcademicYearStatus(
  yearId: string,
  status: 'open' | 'closed',
) {
  await requireGrant(ACADEMIC_YEAR_GRANTS.update);
  return simpleAction(() =>
    authFetch(`/academic-years/${yearId}`, {
      method: 'PATCH',
      body: { status },
    }),
  );
}

export async function setPeriodGrading(
  yearId: string,
  periodId: string,
  isOpenForGrading: boolean,
) {
  await requireGrant(ACADEMIC_YEAR_GRANTS.update);
  return simpleAction(() =>
    authFetch(`/academic-years/${yearId}/periods/${periodId}`, {
      method: 'PATCH',
      body: { isOpenForGrading },
    }),
  );
}

export async function deleteAcademicYear(yearId: string) {
  await requireGrant(ACADEMIC_YEAR_GRANTS.delete);
  return simpleAction(() =>
    authFetch(`/academic-years/${yearId}`, { method: 'DELETE' }),
  );
}
