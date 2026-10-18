'use server';

import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api/api-fetch';
import { setSessionCookie } from '@/lib/auth/session';
import type { LoginResponse, SessionResponse } from '@/lib/auth/types';

const OTP_PATTERN = /^\d{6}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LoginState =
  | { status: 'idle' }
  | { status: 'error'; message: string; email: string }
  | {
      status: 'challenge';
      challengeId: string;
      expiresAt: string;
      email: string;
    };

export type VerifyOtpState =
  { status: 'idle' } | { status: 'error'; message: string };

const toMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password)
    return {
      status: 'error',
      message: 'Ingresa tu correo y contraseña',
      email,
    };

  let response: LoginResponse;

  try {
    response = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error), email };
  }

  if (response.twoFactorRequired)
    return {
      status: 'challenge',
      challengeId: response.challengeId,
      expiresAt: response.expiresAt,
      email,
    };

  // Primer login o usuario sin 2FA: la API ya entrega la sesión.
  await setSessionCookie(response.accessToken, response.expiresAt);
  redirect('/');
}

export async function verifyOtp(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const challengeId = String(formData.get('challengeId') ?? '');
  const code = String(formData.get('code') ?? '');

  if (!UUID_PATTERN.test(challengeId))
    return {
      status: 'error',
      message: 'La verificación expiró, vuelve a iniciar sesión',
    };

  if (!OTP_PATTERN.test(code))
    return { status: 'error', message: 'Ingresa el código de 6 dígitos' };

  let response: SessionResponse;

  try {
    response = await apiFetch<SessionResponse>('/auth/two-factor/verify', {
      method: 'POST',
      body: { challengeId, code },
    });
  } catch (error) {
    return { status: 'error', message: toMessage(error) };
  }

  await setSessionCookie(response.accessToken, response.expiresAt);
  redirect('/');
}
