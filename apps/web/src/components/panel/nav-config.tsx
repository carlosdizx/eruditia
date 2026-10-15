'use client';

import {
  Building2Icon,
  CalendarRangeIcon,
  DoorOpenIcon,
  LayersIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  ACADEMIC_YEAR_GRANTS,
  CLASSROOM_GRANTS,
  GRADE_LEVEL_GRANTS,
  STUDENT_GRANTS,
  USER_GRANTS,
  type Grant,
} from '@/lib/auth/permissions';

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  // Si se define, el item solo aparece cuando el usuario lo cumple.
  grant?: Grant;
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
        grant: USER_GRANTS.list,
      },
      {
        title: 'Estudiantes',
        url: '/estudiantes',
        icon: GraduationCapIcon,
        grant: STUDENT_GRANTS.list,
      },
      {
        title: 'Años lectivos',
        url: '/anios-lectivos',
        icon: CalendarRangeIcon,
        grant: ACADEMIC_YEAR_GRANTS.list,
      },
      {
        title: 'Grados',
        url: '/grados',
        icon: LayersIcon,
        grant: GRADE_LEVEL_GRANTS.list,
      },
      {
        title: 'Salones',
        url: '/salones',
        icon: DoorOpenIcon,
        grant: CLASSROOM_GRANTS.list,
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
