import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import {
  ProfileSkeleton,
  ProfileView,
} from '@/components/profile/profile-view';
import { requireSuperAdmin } from '@/lib/auth/current-user';

export const metadata: Metadata = { title: 'Perfil' };

async function Profile() {
  return <ProfileView user={await requireSuperAdmin()} />;
}

export default function AdminProfilePage() {
  return (
    <>
      <PanelHeader
        crumbs={[{ label: 'Administración' }, { label: 'Perfil' }]}
      />
      <PanelContent>
        <Suspense fallback={<ProfileSkeleton />}>
          <Profile />
        </Suspense>
      </PanelContent>
    </>
  );
}
