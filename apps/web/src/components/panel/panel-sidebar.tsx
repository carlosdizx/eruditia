import {
  ADMIN_HOME,
  ORG_HOME,
  requireOrgUser,
  requireSuperAdmin,
} from '@/lib/auth/current-user';
import type { CurrentUser } from '@/lib/auth/types';
import { initialsOf } from '@/lib/format';
import { AppSidebar } from './app-sidebar';
import type { SidebarUser } from './nav-user';

const toSidebarUser = (user: CurrentUser, profileUrl: string): SidebarUser => ({
  name: `${user.firstName} ${user.lastName}`,
  email: user.email,
  initials: initialsOf(user),
  profileUrl,
});

// Leen la sesión, así que se renderizan dentro de <Suspense> en cada layout.
export async function OrgSidebar() {
  const user = await requireOrgUser();

  return (
    <AppSidebar
      panel="org"
      title={user.organization?.name ?? 'Eruditia'}
      subtitle={user.role.labelEs}
      permissions={user.permissions}
      user={toSidebarUser(user, ORG_HOME)}
    />
  );
}

export async function AdminSidebar() {
  const user = await requireSuperAdmin();

  return (
    <AppSidebar
      panel="admin"
      title="Eruditia"
      subtitle="Administración del sistema"
      permissions={user.permissions}
      user={toSidebarUser(user, ADMIN_HOME)}
    />
  );
}
