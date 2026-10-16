'use client';

import {
  Building2Icon,
  CalendarRangeIcon,
  BookOpenIcon,
  FileTextIcon,
  LifeBuoyIcon,
  TrophyIcon,
  TrendingUpIcon,
  DoorOpenIcon,
  PresentationIcon,
  SettingsIcon,
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
  CLASSROOM_SUBJECT_GRANTS,
  ENROLLMENT_GRANTS,
  SUBJECT_GRANTS,
  GRADE_LEVEL_GRANTS,
  GRADING_SCALE_GRANTS,
  RANKING_GRANTS,
  RECOVERY_GRANTS,
  REPORT_CARD_GRANTS,
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
      {
        title: 'Materias',
        url: '/materias',
        icon: BookOpenIcon,
        grant: SUBJECT_GRANTS.list,
      },
      {
        title: 'Promoción anual',
        url: '/promocion',
        icon: TrendingUpIcon,
        grant: ENROLLMENT_GRANTS.promote,
      },
      {
        title: 'Mis clases',
        url: '/mis-clases',
        icon: PresentationIcon,
        grant: CLASSROOM_SUBJECT_GRANTS.mine,
      },
      {
        title: 'Recuperaciones',
        url: '/recuperaciones',
        icon: LifeBuoyIcon,
        grant: RECOVERY_GRANTS.manage,
      },
      {
        title: 'Ranking',
        url: '/ranking',
        icon: TrophyIcon,
        grant: RANKING_GRANTS.view,
      },
      {
        title: 'Mi boletín',
        url: '/boletin',
        icon: FileTextIcon,
        grant: REPORT_CARD_GRANTS.own,
      },
      {
        title: 'Ajustes',
        url: '/ajustes',
        icon: SettingsIcon,
        grant: GRADING_SCALE_GRANTS.update,
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
