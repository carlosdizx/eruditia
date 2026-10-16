import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  ArrowLeftIcon,
  CalendarRangeIcon,
  EyeIcon,
  LockIcon,
} from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { ORG_HOME, requireOrgUser } from '@/lib/auth/current-user';
import { canOpenGradebooks } from '@/lib/auth/permissions';
import { GradebookSheet } from './_components/gradebook-sheet';
import type { Gradebook, GradebookLock } from '../types';

export const metadata: Metadata = { title: 'Planilla de notas' };

type Props = PageProps<'/planillas/[classroomSubjectId]'>;

const LOCK_MESSAGES: Record<GradebookLock, string> = {
  read_only:
    'Vista de solo lectura: como director de grupo puedes consultar esta materia, pero la califica su profesor.',
  period_closed:
    'El periodo está cerrado para el ingreso de notas. Pide al administrador que lo reabra si necesitas corregir algo.',
  year_closed:
    'El año lectivo está cerrado: las notas ya no se pueden modificar.',
};

async function GradebookView({ params, searchParams }: Props) {
  const me = await requireOrgUser();
  if (!canOpenGradebooks(me)) redirect(ORG_HOME);

  const { classroomSubjectId } = await params;
  const { periodo } = await searchParams;
  const periodId = typeof periodo === 'string' ? periodo : undefined;

  let gradebook: Gradebook;
  try {
    gradebook = await authFetch<Gradebook>(
      `/gradebooks/${classroomSubjectId}${periodId ? `?periodId=${periodId}` : ''}`,
    );
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }

  const { classroomSubject, classroom, academicYear, periods, period, lock } =
    gradebook;

  const back =
    me.role.name === 'TEACHER'
      ? { href: '/mis-clases', label: 'Mis clases' }
      : { href: `/salones/${classroom.id}`, label: classroom.name };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        nativeButton={false}
        render={<Link href={back.href} />}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        {back.label}
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
          {classroomSubject.subject.name}
          <Badge variant="outline">{classroom.name}</Badge>
        </h1>
        <p className="text-muted-foreground text-sm">
          {[
            classroom.gradeLevel?.name,
            academicYear.name,
            classroomSubject.teacher
              ? `Prof. ${classroomSubject.teacher.firstName} ${classroomSubject.teacher.lastName}`
              : 'Sin docente',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {!period ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarRangeIcon />
            </EmptyMedia>
            <EmptyTitle>Sin periodos</EmptyTitle>
            <EmptyDescription>
              El año lectivo {academicYear.name} todavía no tiene periodos
              configurados.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <nav aria-label="Periodos" className="flex flex-wrap gap-2">
            {periods.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant={option.id === period.id ? 'default' : 'outline'}
                nativeButton={false}
                render={
                  <Link
                    href={`/planillas/${classroomSubject.id}?periodo=${option.id}`}
                    aria-current={option.id === period.id ? 'page' : undefined}
                  />
                }
              >
                {!option.isOpenForGrading && (
                  <LockIcon data-icon="inline-start" />
                )}
                {option.name}
                <span className="opacity-70">({option.weightPercentage}%)</span>
              </Button>
            ))}
          </nav>

          {lock && (
            <div className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
              {lock === 'read_only' ? (
                <EyeIcon className="mt-0.5 size-4 shrink-0" />
              ) : (
                <LockIcon className="mt-0.5 size-4 shrink-0" />
              )}
              {LOCK_MESSAGES[lock]}
            </div>
          )}

          {!gradebook.students.length ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Sin estudiantes</EmptyTitle>
                <EmptyDescription>
                  Aún no hay estudiantes matriculados en {classroom.name}.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <GradebookSheet
              // Otro periodo u otras columnas: la planilla empieza de cero.
              key={`${period.id}:${gradebook.items
                .map(({ id, weightPercentage }) => `${id}-${weightPercentage}`)
                .join(',')}`}
              gradebook={gradebook}
            />
          )}
        </>
      )}
    </>
  );
}

export default function GradebookPage(props: Props) {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Planilla de notas' }]} />
      <PanelContent>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <GradebookView {...props} />
        </Suspense>
      </PanelContent>
    </>
  );
}
