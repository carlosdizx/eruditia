import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireSuperAdmin } from '@/lib/auth/current-user';
import { updateOrganization } from '../actions';
import { OrganizationForm } from '../_components/organization-form';
import {
  ORGANIZATION_FIELDS,
  type Organization,
  type OrganizationFormValues,
} from '../types';

export const metadata: Metadata = { title: 'Editar organización' };

type Params = PageProps<'/admin/organizaciones/[organizationId]'>['params'];

const toFormValues = (organization: Organization): OrganizationFormValues => ({
  ...Object.fromEntries(
    ORGANIZATION_FIELDS.map((field) => [field, organization[field] ?? '']),
  ),
  isActive: organization.isActive ? 'on' : '',
});

async function EditOrganization({ params }: { params: Params }) {
  await requireSuperAdmin();

  const { organizationId } = await params;
  let organization: Organization;

  try {
    organization = await authFetch<Organization>(
      `/organizations/${organizationId}`,
    );
  } catch (error) {
    // 404 si no existe, 400 si el id no es un UUID.
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }

  return (
    <OrganizationForm
      mode="edit"
      action={updateOrganization.bind(null, organization.id)}
      initialValues={toFormValues(organization)}
    />
  );
}

export default function EditOrganizationPage({
  params,
}: PageProps<'/admin/organizaciones/[organizationId]'>) {
  return (
    <>
      <PanelHeader
        crumbs={[
          { label: 'Organizaciones', href: '/admin/organizaciones' },
          { label: 'Editar' },
        ]}
      />
      <PanelContent>
        <div className="mx-auto w-full max-w-4xl">
          <Suspense fallback={<TableSkeleton rows={8} />}>
            <EditOrganization params={params} />
          </Suspense>
        </div>
      </PanelContent>
    </>
  );
}
