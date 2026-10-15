import { cache } from 'react';
import { redirect } from 'next/navigation';
import { authFetch } from '@/lib/api/auth-fetch';
import { isGranted, type Grant } from './permissions';
import type { CurrentUser } from './types';

export const ORG_HOME = '/perfil';
export const ADMIN_HOME = '/admin/perfil';

// cache() de React: una sola llamada a /auth/me por request aunque la pidan el
// layout y la página. No se cachea entre requests para no servir datos de un
// usuario anterior tras cerrar sesión.
export const getCurrentUser = cache(() => authFetch<CurrentUser>('/auth/me'));

// El super admin tiene un rol de sistema (core) y no pertenece a ninguna
// organización.
export const isSuperAdmin = (user: CurrentUser) =>
  user.role.category === 'core';

export const homeFor = (user: CurrentUser) =>
  isSuperAdmin(user) ? ADMIN_HOME : ORG_HOME;

export async function requireOrgUser() {
  const user = await getCurrentUser();
  if (isSuperAdmin(user)) redirect(ADMIN_HOME);
  return user;
}

export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) redirect(ORG_HOME);
  return user;
}

export async function requireGrant(grant: Grant) {
  const user = await requireOrgUser();
  if (!isGranted(user, grant)) redirect(ORG_HOME);
  return user;
}
