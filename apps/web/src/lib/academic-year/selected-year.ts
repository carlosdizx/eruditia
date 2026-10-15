import { cache } from 'react';
import { cookies } from 'next/headers';
import { authFetch } from '@/lib/api/auth-fetch';
import { getCurrentUser } from '@/lib/auth/current-user';
import { ACADEMIC_YEAR_GRANTS, isGranted } from '@/lib/auth/permissions';

export const ACADEMIC_YEAR_COOKIE = 'eruditia_academic_year';

export type AcademicYearOption = {
  id: string;
  name: string;
  isActive: boolean;
  status: 'open' | 'closed';
};

// Año con el que se filtran salones, matrículas y notas: el que el usuario
// eligió en el selector (cookie) o, si no, el activo de la organización.
export const getSelectedAcademicYear = cache(async () => {
  const me = await getCurrentUser();
  if (!isGranted(me, ACADEMIC_YEAR_GRANTS.list))
    return { allowed: false, years: [], selected: null } as const;

  const years = await authFetch<AcademicYearOption[]>('/academic-years');
  const chosenId = (await cookies()).get(ACADEMIC_YEAR_COOKIE)?.value;

  const selected =
    years.find(({ id }) => id === chosenId) ??
    years.find(({ isActive }) => isActive) ??
    years[0] ??
    null;

  return { allowed: true, years, selected } as const;
});
