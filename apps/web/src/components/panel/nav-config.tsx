'use client';

import {
  Building2Icon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import { Permission } from '@/lib/auth/permissions';

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  // Si se define, el item solo aparece cuando la organización tiene el permiso.
  permission?: Permission;
};

export type PanelKind = 'org' | 'admin';

export const NAV: Record<PanelKind, { label: string; items: NavItem[] }> = {
  org: {
    label: 'Mi organización',
    items: [
      { title: 'Perfil', url: '/perfil', icon: UserIcon },
      {
        title: 'Usuarios',
        url: '/usuarios',
        icon: UsersIcon,
        permission: Permission.USER_LIST,
      },
    ],
  },
  admin: {
    label: 'Administración',
    items: [
      { title: 'Perfil', url: '/admin/perfil', icon: ShieldCheckIcon },
      {
        title: 'Organizaciones',
        url: '/admin/organizaciones',
        icon: Building2Icon,
      },
    ],
  },
};
