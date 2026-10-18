import { redirect } from 'next/navigation';
import { getSessionToken } from '@/lib/auth/session';
import { ApiError, apiFetch } from './api-fetch';

type AuthFetchOptions = Omit<Parameters<typeof apiFetch>[1], 'token'>;

// Llama a la API con el token de la cookie. Sin sesión, o si la API la
// rechaza (expiró o fue revocada), manda al login.
export async function authFetch<T>(
  path: string,
  options?: AuthFetchOptions,
): Promise<T> {
  const token = await getSessionToken();

  if (!token) redirect('/login');

  try {
    return await apiFetch<T>(path, { ...options, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    throw error;
  }
}
