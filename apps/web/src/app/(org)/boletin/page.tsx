import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { ReportCard } from '@/components/grading/report-card';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { REPORT_CARD_GRANTS } from '@/lib/auth/permissions';
import type { ReportCardResponse } from '@/lib/grading/report-card';

export const metadata: Metadata = { title: 'Mi boletín' };

async function ReportCardView({ searchParams }: PageProps<'/boletin'>) {
  await requireGrant(REPORT_CARD_GRANTS.own);

  const { anio } = await searchParams;
  const yearId = typeof anio === 'string' ? anio : undefined;

  let data: ReportCardResponse;
  try {
    data = await authFetch<ReportCardResponse>(
      `/report-cards/me${yearId ? `?academicYearId=${yearId}` : ''}`,
    );
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 400 || (error.status === 404 && yearId)) notFound();
    if (error.status !== 404) throw error;
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Sin ficha de estudiante</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const current = data.reportCard?.academicYear.id;

  return (
    <ReportCard
      data={data}
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
                    href={`/boletin?anio=${year.id}`}
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
  );
}

export default function ReportCardPage(props: PageProps<'/boletin'>) {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Mi boletín' }]} />
      <PanelContent>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <ReportCardView {...props} />
        </Suspense>
      </PanelContent>
    </>
  );
}
