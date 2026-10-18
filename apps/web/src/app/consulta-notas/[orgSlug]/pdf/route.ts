import type { NextRequest } from 'next/server';
import { fileResponse, periodQuery } from '@/lib/api/file-response';

// Portal sin sesión: PDF del boletín por año + documento
// (?anio=&documento=&periodo=).
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/consulta-notas/[orgSlug]/pdf'>,
) {
  const { orgSlug } = await ctx.params;
  const params = request.nextUrl.searchParams;
  return await fileResponse(
    `/public/organizations/${encodeURIComponent(orgSlug)}/report-card/pdf${periodQuery(
      request,
      {
        academicYearId: params.get('anio') ?? '',
        documentNumber: params.get('documento') ?? '',
      },
    )}`,
    { auth: false },
  );
}
