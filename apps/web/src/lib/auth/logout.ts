'use server';

import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api/api-fetch';
import { deleteSessionCookie, getSessionToken } from './session';

export type LogoutState =
  { status: 'idle' } | { status: 'error'; message: string };

// Revoca la sesión en la API antes de borrar la cookie. Un 401 significa que la
// sesión ya no existe en el servidor, así que también se limpia; cualquier otro
// fallo conserva la cookie para poder reintentar y no dejar la sesión viva.
export async function logout(_prev: LogoutState): Promise<LogoutState> {
  const token = await getSessionToken();

  if (token) {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST', token });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401)
        return {
          status: 'error',
          message:
            error instanceof ApiError
              ? error.message
              : 'No pudimos cerrar la sesión',
        };
    }
  }

  await deleteSessionCookie();
  redirect('/login');
}
