import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireSuperAdmin } from '@/lib/auth/current-user';
import type { Organization } from '../../types';
import {
  PermissionsForm,
  type CatalogPermission,
} from './_components/permissions-form';

export const metadata: Metadata = { title: 'Permisos de la organización' };

type Params =
  PageProps<'/admin/organizaciones/[organizationId]/permisos'>['params'];

async function OrganizationPermissions({ params }: { params: Params }) {
  await requireSuperAdmin();

  const { organizationId } = await params;

  const [organization, catalog, assigned] = await Promise.all([
    authFetch<Organization>(`/organizations/${organizationId}`),
    authFetch<CatalogPermission[]>('/permissions'),
    authFetch<string[]>(`/organizations/${organizationId}/permissions`),
  ]).catch((error: unknown) => {
    // 404 si no existe (o está eliminada), 400 si el id no es un UUID.
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound();
    throw error;
  });

  return (
    <PermissionsForm
      organization={{ id: organization.id, name: organization.name }}
      catalog={catalog}
      assigned={assigned}
    />
  );
}

export default function OrganizationPermissionsPage({
  params,
}: PageProps<'/admin/organizaciones/[organizationId]/permisos'>) {
  return (
    <>
      <PanelHeader
        crumbs={[
          { label: 'Organizaciones', href: '/admin/organizaciones' },
          { label: 'Permisos' },
        ]}
      />
      <PanelContent>
        <div className="mx-auto w-full max-w-3xl">
          <Suspense fallback={<TableSkeleton rows={6} />}>
            <OrganizationPermissions params={params} />
          </Suspense>
        </div>
      </PanelContent>
    </>
  );
}
