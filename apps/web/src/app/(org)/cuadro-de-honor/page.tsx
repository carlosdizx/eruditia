import type { Metadata } from 'next';
import { Fragment, Suspense } from 'react';
import { AwardIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PositionBadge } from '@/components/grading/position-badge';
import { ScoreText } from '@/components/grading/score-text';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { RankingFilters } from '../ranking/_components/ranking-filters';
import { ANNUAL, type HonorRoll, type RankingOptions } from '../ranking/types';
import { PrintButton } from './_components/print-button';

export const metadata: Metadata = { title: 'Cuadro de honor' };

type Props = PageProps<'/cuadro-de-honor'>;

const single = (value: string | string[] | undefined) =>
  typeof value === 'string' && value ? value : undefined;

const TOP_OPTIONS = [
  { value: '3', label: 'Top 3' },
  { value: '5', label: 'Top 5' },
  { value: '10', label: 'Top 10' },
  { value: 'todos', label: 'Todos' },
];
const GROUP_OPTIONS = [
  { value: 'salon', label: 'Por salón' },
  { value: 'grado', label: 'Por grado' },
];
const ELIGIBILITY_OPTIONS = [
  { value: 'todos', label: 'Todos los estudiantes' },
  { value: 'sin-perdidas', label: 'Sin materias perdidas' },
];

const pick = (options: { value: string }[], value: string | undefined) =>
  options.find((option) => option.value === value)?.value ?? options[0].value;

async function HonorRollView({ searchParams }: Props) {
  const me = await requireGrant(RANKING_GRANTS.view);
  const params = await searchParams;

  // El admin sigue el año del selector; el profesor, el año activo.
  const { selected } = await getSelectedAcademicYear();
  const year: Record<string, string> = selected
    ? { academicYearId: selected.id }
    : {};
  const options = await authFetch<RankingOptions>(
    `/rankings/options?${new URLSearchParams(year)}`,
  );

  const period =
    options.periods.find(({ id }) => id === single(params.periodo)) ?? null;
  const top = pick(TOP_OPTIONS, single(params.top));
  const group = pick(GROUP_OPTIONS, single(params.agrupar));
  const eligibility = pick(ELIGIBILITY_OPTIONS, single(params.elegibles));

  const honorRoll = await authFetch<HonorRoll>(
    `/rankings/honor-roll?${new URLSearchParams({
      ...year,
      ...(period && { periodId: period.id }),
      ...(top !== 'todos' && { limit: top }),
      groupBy: group === 'grado' ? 'gradeLevel' : 'classroom',
      onlyAllPassed: String(eligibility === 'sin-perdidas'),
    })}`,
  );
  const groups = honorRoll.groups.filter(({ rows }) => rows.length);
  const { scale } = honorRoll;
  const periodLabel = period ? period.name : 'Acumulado anual';

  return (
    <>
      <div className="flex flex-col gap-4 print:hidden">
        <RankingFilters
          path="/cuadro-de-honor"
          base={{}}
          filters={[
            {
              param: 'periodo',
              label: 'Periodo',
              items: [
                { value: ANNUAL, label: 'Acumulado anual' },
                ...options.periods.map(({ id, name }) => ({
                  value: id,
                  label: name,
                })),
              ],
              value: period?.id ?? ANNUAL,
            },
            {
              param: 'top',
              label: 'Mostrar',
              items: TOP_OPTIONS,
              value: top,
            },
            {
              param: 'agrupar',
              label: 'Agrupar',
              items: GROUP_OPTIONS,
              value: group,
            },
            {
              param: 'elegibles',
              label: 'Estudiantes',
              items: ELIGIBILITY_OPTIONS,
              value: eligibility,
            },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            Promedio general ponderado por el peso de cada materia. Quien no
            perdió materias va antes y los empates comparten el puesto.
          </p>
          {groups.length > 0 && <PrintButton />}
        </div>
      </div>

      {/* Encabezado de la versión impresa. */}
      <div className="hidden flex-col gap-1 print:flex">
        <h1 className="text-2xl font-semibold">
          Cuadro de honor · {me.organization?.name}
        </h1>
        <p className="text-sm">
          {periodLabel} {honorRoll.academicYear?.name} ·{' '}
          {TOP_OPTIONS.find(({ value }) => value === top)?.label} ·{' '}
          {GROUP_OPTIONS.find(({ value }) => value === group)?.label}
          {eligibility === 'sin-perdidas' && ' · Sin materias perdidas'}
        </p>
      </div>

      {!groups.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AwardIcon />
            </EmptyMedia>
            <EmptyTitle>Sin estudiantes en el cuadro de honor</EmptyTitle>
            <EmptyDescription>
              {honorRoll.academicYear
                ? `Aún no hay notas para ${periodLabel.toLowerCase()} o ningún estudiante cumple el filtro.`
                : 'Tu colegio todavía no tiene un año lectivo activo.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:hidden">
            {groups.map(({ id, name, gradeLevel, total, rows }) => (
              <Card key={id} size="sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {name}
                    {gradeLevel && (
                      <Badge variant="outline">{gradeLevel.name}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {total} estudiantes con notas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="flex flex-col gap-2">
                    {rows.map((row) => (
                      <li
                        key={row.enrollmentId}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-2 py-1.5',
                          row.position === 1 &&
                            'bg-amber-50 dark:bg-amber-500/10',
                        )}
                      >
                        <PositionBadge
                          position={row.position}
                          className="w-12 shrink-0"
                        />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">
                            {row.student.lastName} {row.student.firstName}
                          </span>
                          {group === 'grado' && (
                            <span className="text-muted-foreground text-xs">
                              {row.classroom.name}
                            </span>
                          )}
                        </span>
                        <ScoreText score={row.score} scale={scale} />
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold print:hidden">
              Tabla comparativa
            </h2>
            <div className="overflow-x-auto rounded-xl border print:overflow-visible print:rounded-none print:border-0">
              <table className="w-full min-w-max border-collapse text-sm print:min-w-0">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-left font-medium">Puesto</th>
                    <th className="px-3 py-2 text-left font-medium">
                      Código / Documento
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Estudiante
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Salón</th>
                    <th className="px-3 py-2 text-left font-medium">Materia</th>
                    <th className="px-3 py-2 text-center font-medium">
                      Promedio
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      Aprobadas / Perdidas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(({ id, name, rows }) => (
                    <Fragment key={id}>
                      <tr className="bg-muted/30 break-inside-avoid border-b">
                        <th
                          colSpan={7}
                          className="px-3 py-1.5 text-left text-xs font-semibold tracking-wide uppercase"
                        >
                          {name}
                        </th>
                      </tr>
                      {rows.map((row) => (
                        <tr
                          key={row.enrollmentId}
                          className="break-inside-avoid border-b last:border-b-0"
                        >
                          <td className="px-3 py-1.5">
                            <PositionBadge position={row.position} />
                          </td>
                          <td className="text-muted-foreground px-3 py-1.5 tabular-nums">
                            {row.student.studentCode} ·{' '}
                            {row.student.documentType}{' '}
                            {row.student.documentNumber}
                          </td>
                          <td className="px-3 py-1.5 font-medium whitespace-nowrap">
                            {row.student.lastName} {row.student.firstName}
                          </td>
                          <td className="px-3 py-1.5">{row.classroom.name}</td>
                          <td className="text-muted-foreground px-3 py-1.5">
                            Promedio general
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <ScoreText score={row.score} scale={scale} />
                          </td>
                          <td className="px-3 py-1.5 text-center tabular-nums">
                            {row.passedSubjects} /{' '}
                            <span
                              className={cn(
                                row.failedSubjects > 0 &&
                                  'text-destructive font-medium',
                              )}
                            >
                              {row.failedSubjects}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default function HonorRollPage(props: Props) {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Cuadro de honor' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <HonorRollView {...props} />
        </Suspense>
      </PanelContent>
    </>
  );
}
