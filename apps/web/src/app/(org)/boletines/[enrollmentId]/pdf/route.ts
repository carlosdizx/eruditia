import type { NextRequest } from 'next/server';
import { fileResponse, periodQuery } from '@/lib/api/file-response';

// PDF del boletín de una matrícula (admin o director de grupo).
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/boletines/[enrollmentId]/pdf'>,
) {
  const { enrollmentId } = await ctx.params;
  return await fileResponse(
    `/enrollments/${encodeURIComponent(enrollmentId)}/report-card/pdf${periodQuery(request)}`,
  );
}
