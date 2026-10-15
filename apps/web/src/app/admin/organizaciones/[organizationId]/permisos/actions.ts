'use server';

import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireSuperAdmin } from '@/lib/auth/current-user';

// PUT reemplaza la lista completa: lo que no venga queda sin asignar.
export async function setOrganizationPermissions(
  organizationId: string,
  permissions: string[],
): Promise<
  { ok: true; permissions: string[] } | { ok: false; message: string }
> {
  await requireSuperAdmin();

  try {
    const assigned = await authFetch<string[]>(
      `/organizations/${organizationId}/permissions`,
      { method: 'PUT', body: { permissions } },
    );
    return { ok: true, permissions: assigned };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : 'No pudimos guardar los permisos',
    };
  }
}
