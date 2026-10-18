import { getSessionToken } from '@/lib/auth/session';
import { ApiError, apiFetchFile } from './api-fetch';

type FileOptions = Parameters<typeof apiFetchFile>[1] & { auth?: boolean };

// Respuesta de un route handler que reenvía un archivo de la API (PDF) al
// navegador. Los errores llegan como texto para que se vean en la pestaña.
export async function fileResponse(
  path: string,
  { auth = true, ...options }: FileOptions = {},
): Promise<Response> {
  const token = auth ? await getSessionToken() : undefined;
  if (auth && !token)
    return new Response('Tu sesión expiró. Vuelve a iniciar sesión.', {
      status: 401,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });

  try {
    const { content, contentType, disposition } = await apiFetchFile(path, {
      ...options,
      token,
    });
    return new Response(content, {
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
        ...(disposition && { 'content-disposition': disposition }),
      },
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof ApiError ? error.message : 'Ocurrió un error inesperado';
    return new Response(message, {
      status,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}

// ?periodo= de la página → ?periodId= de la API.
export const periodQuery = (
  request: Request,
  extra: Record<string, string> = {},
) => {
  const periodId = new URL(request.url).searchParams.get('periodo');
  const params = new URLSearchParams({
    ...extra,
    ...(periodId && { periodId }),
  });
  return params.size ? `?${params}` : '';
};
