'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { GRADING_SCALE_GRANTS } from '@/lib/auth/permissions';
import type { GradingScaleFormState, GradingScaleFormValues } from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): GradingScaleFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim().replace(',', '.')]),
  );

export async function saveGradingScale(
  _prev: GradingScaleFormState,
  formData: FormData,
): Promise<GradingScaleFormState> {
  await requireGrant(GRADING_SCALE_GRANTS.update);

  const values = readValues(formData);

  try {
    await authFetch('/grading-scale', {
      method: 'PUT',
      body: {
        minScore: Number(values.minScore),
        maxScore: Number(values.maxScore),
        passingScore: Number(values.passingScore),
        decimalPlaces: Number(values.decimalPlaces),
      },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: 'Se guardó la escala de calificación' };
}
