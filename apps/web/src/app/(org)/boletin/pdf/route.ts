import type { NextRequest } from 'next/server';
import { fileResponse, periodQuery } from '@/lib/api/file-response';

// PDF del boletín del estudiante que inició sesión (?anio=&periodo=).
export async function GET(request: NextRequest) {
  const year = request.nextUrl.searchParams.get('anio');
  return await fileResponse(
    `/report-cards/me/pdf${periodQuery(request, year ? { academicYearId: year } : {})}`,
  );
}
