'use server';

import { ApiError, apiFetch } from '@/lib/api/api-fetch';
import type { ReportCardResponse } from '@/lib/grading/report-card';

export type LookupCredentials = {
  documentNumber: string;
  accessPin: string;
  academicYearId?: string;
};

export type LookupResult =
  { ok: true; data: ReportCardResponse } | { ok: false; message: string };

// Sin sesión: cada consulta (también al cambiar de año) envía documento + PIN.
export async function lookupReportCard(
  slug: string,
  credentials: LookupCredentials,
): Promise<LookupResult> {
  try {
    const data = await apiFetch<ReportCardResponse>(
      `/public/report-cards/${encodeURIComponent(slug)}`,
      { method: 'POST', body: credentials },
    );
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : 'Ocurrió un error inesperado',
    };
  }
}
