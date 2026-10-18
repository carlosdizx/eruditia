import type { NextRequest } from 'next/server';
import { fileResponse, periodQuery } from '@/lib/api/file-response';

// Un solo PDF con los boletines de todo el salón (admin o director de grupo).
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/salones/[classroomId]/boletines/pdf'>,
) {
  const { classroomId } = await ctx.params;
  return await fileResponse(
    `/classrooms/${encodeURIComponent(classroomId)}/report-cards/pdf${periodQuery(request)}`,
  );
}
