import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { requireSuperAdmin } from '@/lib/auth/current-user';
import { createOrganization } from '../actions';
import { OrganizationForm } from '../_components/organization-form';

export const metadata: Metadata = { title: 'Nueva organización' };

async function CreateOrganization() {
  await requireSuperAdmin();
  return <OrganizationForm mode="create" action={createOrganization} />;
}

export default function NewOrganizationPage() {
  return (
    <>
      <PanelHeader
        crumbs={[
          { label: 'Organizaciones', href: '/admin/organizaciones' },
          { label: 'Nueva' },
        ]}
      />
      <PanelContent>
        <div className="mx-auto w-full max-w-4xl">
          <Suspense>
            <CreateOrganization />
          </Suspense>
        </div>
      </PanelContent>
    </>
  );
}
