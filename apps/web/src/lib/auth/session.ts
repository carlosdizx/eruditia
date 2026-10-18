import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './constants';

// httpOnly: el token nunca queda expuesto al JavaScript del navegador.
export async function setSessionCookie(token: string, expiresAt: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function deleteSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
