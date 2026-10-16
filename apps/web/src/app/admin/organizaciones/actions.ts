'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireSuperAdmin } from '@/lib/auth/current-user';
import {
  ORGANIZATION_FIELDS,
  OWNER_FIELDS,
  type OrganizationFormState,
  type OrganizationFormValues,
} from './types';

const LIST_PATH = '/admin/organizaciones';

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

const readValues = (formData: FormData): OrganizationFormValues =>
  Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => !key.startsWith('$ACTION'))
      .map(([key, value]) => [key, String(value).trim()]),
  );

// En la creación los vacíos se omiten; en la edición se mandan como null para
// poder borrar un campo opcional.
const organizationBody = (
  values: OrganizationFormValues,
  empty: undefined | null,
) =>
  Object.fromEntries(
    ORGANIZATION_FIELDS.map((field) => {
      const value = values[field] || empty;
      if (field === 'passingGrade')
        return [field, value ? Number(value) : undefined];
      return [
        field,
        field === 'country' && value ? value.toUpperCase() : value,
      ];
    }),
  );

export async function createOrganization(
  _prev: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  await requireSuperAdmin();

  const values = readValues(formData);
  const owner = Object.fromEntries(
    OWNER_FIELDS.map((field) => [field, values[`owner.${field}`]]),
  );

  try {
    await authFetch('/organizations', {
      method: 'POST',
      body: { organization: organizationBody(values, undefined), owner },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  redirect(LIST_PATH);
}

export async function updateOrganization(
  organizationId: string,
  _prev: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  await requireSuperAdmin();

  const values = readValues(formData);

  try {
    await authFetch(`/organizations/${organizationId}`, {
      method: 'PATCH',
      body: {
        ...organizationBody(values, null),
        isActive: values.isActive === 'on',
      },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), values };
  }

  redirect(LIST_PATH);
}

export async function deleteOrganization(
  organizationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireSuperAdmin();

  try {
    await authFetch(`/organizations/${organizationId}`, { method: 'DELETE' });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true };
}

export async function restoreOrganization(
  organizationId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireSuperAdmin();

  try {
    await authFetch(`/organizations/${organizationId}/restore`, {
      method: 'PATCH',
    });
  } catch (error) {
    return { ok: false, message: toMessage(error) };
  }

  refresh();
  return { ok: true };
}
