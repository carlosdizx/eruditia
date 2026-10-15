import { headers } from 'next/headers';
import { env } from '@/config/env';

const DEFAULT_ERROR_MESSAGE = 'No pudimos conectar con el servidor';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
};

// NestJS responde { message: string | string[] } en sus excepciones.
const readErrorMessage = async (response: Response): Promise<string> => {
  const payload = await response.json().catch(() => null);
  const message = payload?.message;

  if (Array.isArray(message)) return message[0] ?? DEFAULT_ERROR_MESSAGE;

  return typeof message === 'string' ? message : DEFAULT_ERROR_MESSAGE;
};

// La API registra IP y user-agent en la sesión: se reenvían los del navegador
// en lugar de los del servidor de Next.
const forwardedHeaders = async (): Promise<Record<string, string>> => {
  const incoming = await headers();
  const forwarded: Record<string, string> = {};

  const userAgent = incoming.get('user-agent');
  const forwardedFor = incoming.get('x-forwarded-for');

  if (userAgent) forwarded['user-agent'] = userAgent;
  if (forwardedFor) forwarded['x-forwarded-for'] = forwardedFor;

  return forwarded;
};

export async function apiFetch<T>(
  path: string,
  { body, token, headers: init, ...options }: ApiFetchOptions = {},
): Promise<T> {
  let response: Response;
  // Los archivos van como multipart: fetch pone el content-type con su boundary.
  const isFormData = body instanceof FormData;

  try {
    response = await fetch(new URL(path, env.apiUrl), {
      ...options,
      cache: 'no-store',
      headers: {
        ...(await forwardedHeaders()),
        ...(body !== undefined &&
          !isFormData && { 'content-type': 'application/json' }),
        ...(token && { authorization: `Bearer ${token}` }),
        ...init,
      },
      body: isFormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    });
  } catch {
    throw new ApiError(503, DEFAULT_ERROR_MESSAGE);
  }

  if (!response.ok)
    throw new ApiError(response.status, await readErrorMessage(response));

  // Algunos endpoints (204, o 201 sin retorno) responden sin cuerpo.
  const text = await response.text();

  return (text ? JSON.parse(text) : undefined) as T;
}
