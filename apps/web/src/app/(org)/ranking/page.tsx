import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { TrophyIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Button } from '@/components/ui/button';
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
import {
  RankingFilters,
  type RankingFilter,
} from './_components/ranking-filters';
import { RankingTable } from './_components/ranking-table';
import { SubjectLeadersGrid } from './_components/subject-leaders-grid';
import {
  ANNUAL,
  RANKING_VIEWS,
  type Ranking,
  type RankingOptions,
  type RankingView,
  type SubjectLeaders,
} from './types';

export const metadata: Metadata = { title: 'Ranking' };

type Props = PageProps<'/ranking'>;
type Params = Awaited<Props['searchParams']>;

type ViewProps = {
  options: RankingOptions & {
    academicYear: NonNullable<RankingOptions['academicYear']>;
  };
  params: Params;
  // academicYearId del selector (admin); vacío para usar el año activo.
  year: Record<string, string>;
};

const single = (value: string | string[] | undefined) =>
  typeof value === 'string' && value ? value : undefined;

const classroomLabel = ({
  name,
  gradeLevel,
}: RankingOptions['classrooms'][number]) =>
  gradeLevel ? `${name} · ${gradeLevel.name}` : name;

function NoData({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TrophyIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

// Periodo elegido (null: acumulado anual) y su filtro.
const periodFilter = (options: ViewProps['options'], params: Params) => {
  const period =
    options.periods.find(({ id }) => id === single(params.periodo)) ?? null;
  const filter: RankingFilter = {
    param: 'periodo',
    label: 'Periodo',
    items: [
      { value: ANNUAL, label: 'Acumulado anual' },
      ...options.periods.map(({ id, name }) => ({ value: id, label: name })),
    ],
    value: period?.id ?? ANNUAL,
  };
  return { period, filter };
};

async function ClassroomView({ options, params, year }: ViewProps) {
  const classrooms = options.classrooms.filter(({ general }) => general);
  if (!classrooms.length)
    return (
      <NoData title="Sin salones para el ranking">
        El ranking general se consulta en los salones que diriges como director
        de grupo.
      </NoData>
    );

  const classroom =
    classrooms.find(({ id }) => id === single(params.salon)) ?? classrooms[0];
  const { period, filter } = periodFilter(options, params);
  const ranking = await authFetch<Ranking>(
    `/rankings?${new URLSearchParams({
      ...year,
      classroomId: classroom.id,
      ...(period && { periodId: period.id }),
    })}`,
  );

  return (
    <>
      <RankingFilters
        base={{ vista: 'salon' }}
        filters={[
          {
            param: 'salon',
            label: 'Salón',
            items: classrooms.map((item) => ({
              value: item.id,
              label: classroomLabel(item),
            })),
            value: classroom.id,
          },
          filter,
        ]}
      />
      <p className="text-muted-foreground text-sm">
        {classroom.name} · {period ? period.name : 'Acumulado anual'}{' '}
        {options.academicYear.name} · {ranking.total} estudiantes con notas.
        Promedio ponderado por el peso de cada materia; quien no perdió materias
        va antes, y los empates comparten el puesto.
      </p>
      {!ranking.rows.length ? (
        <NoData title="Sin notas">
          Aún no hay definitivas registradas para este salón.
        </NoData>
      ) : (
        <RankingTable ranking={ranking} scoreLabel="Promedio" />
      )}
    </>
  );
}

async function SubjectView({ options, params, year }: ViewProps) {
  if (!options.subjects.length)
    return (
      <NoData title="Sin materias para el ranking">
        El ranking por materia se consulta en las materias que dictas o en las
        de tu dirección de grupo.
      </NoData>
    );

  const subject =
    options.subjects.find(({ id }) => id === single(params.materia)) ??
    options.subjects[0];
  // Alcance: un salón donde se dicta la materia o todo su grado.
  const classrooms = options.classrooms.filter(({ subjectIds }) =>
    subjectIds.includes(subject.id),
  );
  const grades = [
    ...new Map(
      classrooms.flatMap(({ gradeLevel }) =>
        gradeLevel ? [[gradeLevel.id, gradeLevel]] : [],
      ),
    ).values(),
  ];
  const scopes = [
    ...grades.map(({ id, name }) => ({
      value: `grado:${id}`,
      label: `Todo el grado ${name}`,
    })),
    ...classrooms.map((item) => ({
      value: `salon:${item.id}`,
      label: classroomLabel(item),
    })),
  ];
  const scope =
    scopes.find(({ value }) => value === single(params.alcance)) ?? scopes[0];
  const [kind, scopeId] = scope.value.split(':');
  const { period, filter } = periodFilter(options, params);

  const ranking = await authFetch<Ranking>(
    `/rankings?${new URLSearchParams({
      ...year,
      subjectId: subject.id,
      [kind === 'grado' ? 'gradeLevelId' : 'classroomId']: scopeId,
      ...(period && { periodId: period.id }),
    })}`,
  );

  return (
    <>
      <RankingFilters
        base={{ vista: 'materia' }}
        // Otra materia puede no dictarse en el salón elegido.
        resets={{ materia: ['alcance'] }}
        filters={[
          {
            param: 'materia',
            label: 'Materia',
            items: options.subjects.map(({ id, name }) => ({
              value: id,
              label: name,
            })),
            value: subject.id,
          },
          {
            param: 'alcance',
            label: 'Salón o grado',
            items: scopes,
            value: scope.value,
          },
          filter,
        ]}
      />
      <p className="text-muted-foreground text-sm">
        {subject.name} · {scope.label} ·{' '}
        {period ? period.name : 'Acumulado anual'} {options.academicYear.name} ·{' '}
        {ranking.total} estudiantes con nota. Los empates comparten el puesto.
      </p>
      {!ranking.rows.length ? (
        <NoData title="Sin notas">
          Aún no hay definitivas registradas en esta materia.
        </NoData>
      ) : (
        <RankingTable
          ranking={ranking}
          scoreLabel="Nota"
          showClassroom={kind === 'grado'}
        />
      )}
    </>
  );
}

async function LeadersView({ options, params, year }: ViewProps) {
  const classrooms = options.classrooms.filter(
    ({ subjectIds }) => subjectIds.length,
  );
  if (!classrooms.length)
    return (
      <NoData title="Sin salones">
        No tienes materias ni direcciones de grupo en{' '}
        {options.academicYear.name}.
      </NoData>
    );

  const classroom =
    classrooms.find(({ id }) => id === single(params.salon)) ?? classrooms[0];
  const { period, filter } = periodFilter(options, params);
  const leaders = await authFetch<SubjectLeaders>(
    `/rankings/subject-leaders?${new URLSearchParams({
      ...year,
      classroomId: classroom.id,
      ...(period && { periodId: period.id }),
    })}`,
  );

  return (
    <>
      <RankingFilters
        base={{ vista: 'destacados' }}
        filters={[
          {
            param: 'salon',
            label: 'Salón',
            items: classrooms.map((item) => ({
              value: item.id,
              label: classroomLabel(item),
            })),
            value: classroom.id,
          },
          filter,
        ]}
      />
      <p className="text-muted-foreground text-sm">
        Mejor estudiante de cada materia de {classroom.name} ·{' '}
        {period ? period.name : 'Acumulado anual'} {options.academicYear.name}.
      </p>
      <SubjectLeadersGrid leaders={leaders} />
    </>
  );
}

const VIEWS: Record<
  RankingView,
  (props: ViewProps) => Promise<React.ReactNode>
> = {
  salon: ClassroomView,
  materia: SubjectView,
  destacados: LeadersView,
};

async function RankingContent({ searchParams }: Props) {
  await requireGrant(RANKING_GRANTS.view);
  const params = await searchParams;

  // El admin sigue el año del selector; el profesor, el año activo.
  const { selected } = await getSelectedAcademicYear();
  const year: Record<string, string> = selected
    ? { academicYearId: selected.id }
    : {};
  const options = await authFetch<RankingOptions>(
    `/rankings/options?${new URLSearchParams(year)}`,
  );
  const view =
    RANKING_VIEWS.find(({ value }) => value === single(params.vista))?.value ??
    'salon';
  const View = VIEWS[view];

  return (
    <>
      <nav aria-label="Tipo de ranking" className="flex flex-wrap gap-2">
        {RANKING_VIEWS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={option.value === view ? 'default' : 'outline'}
            nativeButton={false}
            render={
              <Link
                href={`/ranking?vista=${option.value}`}
                aria-current={option.value === view ? 'page' : undefined}
              />
            }
          >
            {option.label}
          </Button>
        ))}
      </nav>
      {!options.academicYear ? (
        <NoData title="Sin año lectivo">
          Tu colegio todavía no tiene un año lectivo activo.
        </NoData>
      ) : (
        <View
          options={{ ...options, academicYear: options.academicYear }}
          params={params}
          year={year}
        />
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
          <RankingContent {...props} />
        </Suspense>
      </PanelContent>
    </>
  );
}
