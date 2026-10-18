'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { USER_GRANTS } from '@/lib/auth/permissions';
import type { UserFormState, UserFormValues } from './types';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): UserFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim()]),
  );

export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireGrant(USER_GRANTS.create);

  const values = readValues(formData);
  const { firstName, lastName, email, documentNumber, phone, roleId } = values;

  try {
    await authFetch('/users', {
      method: 'POST',
      body: {
        firstName,
        lastName,
        email,
        roleId,
        ...(documentNumber && { documentNumber }),
        ...(phone && { phone }),
      },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return {
    status: 'success',
    message: `Se creó la cuenta de ${firstName}. Le enviamos su contraseña temporal por correo.`,
  };
}

export async function updateUser(
  userId: string,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireGrant(USER_GRANTS.update);

  const values = readValues(formData);
  const { firstName, lastName, documentNumber, phone, roleId, isActive } =
    values;

  try {
    await authFetch(`/users/${userId}`, {
      method: 'PATCH',
      body: {
        firstName,
        lastName,
        // Vacío borra el dato.
        documentNumber: documentNumber || null,
        phone: phone || null,
        // Deshabilitados en el form (p. ej. la propia cuenta) no se envían y
        // quedan como están.
        ...(roleId && { roleId }),
        ...(isActive && { isActive: isActive === 'on' }),
      },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  refresh();
  return { status: 'success', message: `Se actualizó a ${firstName}` };
}
