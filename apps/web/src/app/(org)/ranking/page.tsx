import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TrophyIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getSelectedAcademicYear } from '@/lib/academic-year/selected-year';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { RANKING_GRANTS } from '@/lib/auth/permissions';
import { RankingFilters } from './_components/ranking-filters';
import { RankingTable } from './_components/ranking-table';
import { ANNUAL, type Ranking, type RankingOptions } from './types';

export const metadata: Metadata = { title: 'Ranking' };

type Props = PageProps<'/ranking'>;

const single = (value: string | string[] | undefined) =>
  typeof value === 'string' && value ? value : undefined;

async function ClassroomRanking({ searchParams }: Props) {
  await requireGrant(RANKING_GRANTS.view);
  const params = await searchParams;

  // El admin sigue el año del selector; el profesor, el año activo.
  const { selected } = await getSelectedAcademicYear();
  const yearQuery = selected ? `academicYearId=${selected.id}` : '';
  const options = await authFetch<RankingOptions>(
    `/rankings/options?${yearQuery}`,
  );
  const classrooms = options.classrooms.filter(({ general }) => general);

  if (!options.academicYear || !classrooms.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrophyIcon />
          </EmptyMedia>
          <EmptyTitle>Sin salones para el ranking</EmptyTitle>
          <EmptyDescription>
            {options.academicYear
              ? 'El ranking general se consulta en los salones que diriges como director de grupo.'
              : 'Tu colegio todavía no tiene un año lectivo activo.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  const classroom =
    classrooms.find(({ id }) => id === single(params.salon)) ?? classrooms[0];
  const period = options.periods.find(
    ({ id }) => id === single(params.periodo),
  );

  const ranking = await authFetch<Ranking>(
    `/rankings?${new URLSearchParams({
      ...(selected && { academicYearId: selected.id }),
      classroomId: classroom.id,
      ...(period && { periodId: period.id }),
    })}`,
  );

  return (
    <>
      <RankingFilters
        classrooms={classrooms.map(({ id, name, gradeLevel }) => ({
          value: id,
          label: gradeLevel ? `${name} · ${gradeLevel.name}` : name,
        }))}
        periods={[
          { value: ANNUAL, label: 'Acumulado anual' },
          ...options.periods.map(({ id, name }) => ({
            value: id,
            label: name,
          })),
        ]}
        classroomId={classroom.id}
        periodValue={period?.id ?? ANNUAL}
      />

      <p className="text-muted-foreground text-sm">
        {classroom.name} · {period ? period.name : 'Acumulado anual'}{' '}
        {options.academicYear.name} · {ranking.total} estudiantes con notas.
        Promedio ponderado por el peso de cada materia; quien no perdió materias
        va antes, y los empates comparten el puesto.
      </p>

      {!ranking.rows.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Sin notas</EmptyTitle>
            <EmptyDescription>
              Aún no hay definitivas registradas para este salón en{' '}
              {period ? period.name : 'el año'}.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <RankingTable ranking={ranking} scoreLabel="Promedio" />
      )}
    </>
  );
}

export default function RankingPage(props: Props) {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Ranking' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <ClassroomRanking {...props} />
        </Suspense>
      </PanelContent>
    </>
  );
}
