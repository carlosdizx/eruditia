import type { NextRequest } from 'next/server';
import { fileResponse } from '@/lib/api/file-response';

const field = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' && value ? value : undefined;
};

// Portal sin sesión: el formulario reenvía documento + PIN para generar el
// PDF (por POST, para que el PIN no quede en la URL ni en el historial).
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/consulta-notas/[orgSlug]/pdf'>,
) {
  const { orgSlug } = await ctx.params;
  const form = await request.formData();
  return await fileResponse(
    `/public/report-cards/${encodeURIComponent(orgSlug)}/pdf`,
    {
      auth: false,
      method: 'POST',
      body: {
        documentNumber: field(form, 'documentNumber'),
        accessPin: field(form, 'accessPin'),
        academicYearId: field(form, 'academicYearId'),
        periodId: field(form, 'periodId'),
      },
    },
  );
}
