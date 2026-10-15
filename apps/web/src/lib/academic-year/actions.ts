'use server';

import { refresh } from 'next/cache';
import { cookies } from 'next/headers';
import { ACADEMIC_YEAR_COOKIE } from './selected-year';

// Solo guarda la preferencia: cada página valida el año contra la API.
export async function selectAcademicYear(yearId: string) {
  (await cookies()).set(ACADEMIC_YEAR_COOKIE, yearId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  refresh();
}
