import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { ReportCard } from '@/components/grading/report-card';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { REPORT_CARD_GRANTS } from '@/lib/auth/permissions';
import type { ReportCardResponse } from '@/lib/grading/report-card';

export const metadata: Metadata = { title: 'Boletín del estudiante' };

type Props = PageProps<'/boletines/[enrollmentId]'>;

// Solo rutas internas: evita redirigir fuera del panel con ?desde=.
const backPath = (value: unknown) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : null;

async function ReportCardPreview({ params, searchParams }: Props) {
  await requireGrant(REPORT_CARD_GRANTS.preview);

  const { enrollmentId } = await params;
  const back = backPath((await searchParams).desde);

  let data: ReportCardResponse;
  try {
    data = await authFetch<ReportCardResponse>(
      `/enrollments/${enrollmentId}/report-card`,
    );
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }

  const current = data.reportCard?.academicYear.id;
  const query = back ? `?desde=${encodeURIComponent(back)}` : '';

  return (
    <>
      {back && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          nativeButton={false}
          render={<Link href={back} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver
        </Button>
      )}
      <ReportCard
        data={data}
        audience="staff"
        yearSelector={
          data.years.length > 1 && (
            <nav aria-label="Años lectivos" className="flex flex-wrap gap-2">
              {data.years.map((year) => (
                <Button
                  key={year.id}
                  size="sm"
                  variant={year.id === current ? 'default' : 'outline'}
                  nativeButton={false}
                  render={
                    <Link
                      href={`/boletines/${year.enrollmentId}${query}`}
                      aria-current={year.id === current ? 'page' : undefined}
                    />
                  }
                >
                  {year.name}
                </Button>
              ))}
            </nav>
          )
        }
      />
    </>
  );
}

export default function ReportCardPreviewPage(props: Props) {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Boletín del estudiante' }]} />
      <PanelContent>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <ReportCardPreview {...props} />
        </Suspense>
      </PanelContent>
    </>
  );
}
