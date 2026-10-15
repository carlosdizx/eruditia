import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { BookOpenIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSelectedAcademicYear } from '@/lib/academic-year/selected-year';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import {
  CLASSROOM_GRANTS,
  CLASSROOM_SUBJECT_GRANTS,
  isGranted,
  SUBJECT_GRANTS,
} from '@/lib/auth/permissions';
import type { Classroom, Teacher } from '../types';
import {
  AssignmentRowActions,
  AssignSubjectDialog,
} from './_components/assignment-actions';
import type { SubjectOption } from './_components/assignment-form';
import type { ClassroomSubject } from './types';

export const metadata: Metadata = { title: 'Salón' };

async function ClassroomLoad({ classroomId }: { classroomId: string }) {
  await requireGrant(CLASSROOM_GRANTS.list);
  const me = await requireGrant(CLASSROOM_SUBJECT_GRANTS.list);

  const [classroom, assignments, { years }] = await Promise.all([
    authFetch<Classroom>(`/classrooms/${classroomId}`),
    authFetch<ClassroomSubject[]>(`/classrooms/${classroomId}/subjects`),
    getSelectedAcademicYear(),
  ]);

  const year = years.find(({ id }) => id === classroom.academicYearId);
  const closed = year?.status === 'closed';
  // Un año cerrado es historial: solo lectura.
  const canAssign = !closed && isGranted(me, CLASSROOM_SUBJECT_GRANTS.assign);

  const [catalog, teachers] = canAssign
    ? await Promise.all([
        isGranted(me, SUBJECT_GRANTS.list)
          ? authFetch<SubjectOption[]>('/subjects')
          : Promise.resolve([]),
        authFetch<Teacher[]>('/classrooms/teachers'),
      ])
    : [[], []];

  const assigned = new Set(assignments.map(({ subjectId }) => subjectId));
  const available = catalog.filter(({ id }) => !assigned.has(id));
  const totalHours = assignments.reduce(
    (sum, { weeklyHours }) => sum + (weeklyHours ?? 0),
    0,
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            {classroom.name}
            {year && <Badge variant="secondary">{year.name}</Badge>}
            {closed && (
              <Badge variant="outline">Año cerrado · solo lectura</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {classroom.gradeLevel?.name ?? 'Sin grado'} · Director de grupo:{' '}
            {classroom.homeroomTeacher
              ? `${classroom.homeroomTeacher.firstName} ${classroom.homeroomTeacher.lastName}`
              : 'sin asignar'}
            {classroom.capacity ? ` · Cupo: ${classroom.capacity}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex gap-6 text-sm">
          <span>
            <span className="text-foreground font-medium tabular-nums">
              {assignments.length}
            </span>{' '}
            materias
          </span>
          <span>
            <span className="text-foreground font-medium tabular-nums">
              {totalHours}
            </span>{' '}
            horas semanales
          </span>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">Carga académica</h2>
        {canAssign && (
          <AssignSubjectDialog
            classroom={classroom}
            subjects={available}
            teachers={teachers}
          />
        )}
      </div>

      {!assignments.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon />
            </EmptyMedia>
            <EmptyTitle>Sin materias</EmptyTitle>
            <EmptyDescription>
              {canAssign && !catalog.length
                ? 'Primero crea el catálogo de materias de tu colegio.'
                : 'Agrega las materias que se dictan en este salón y el profesor de cada una.'}
            </EmptyDescription>
          </EmptyHeader>
          {canAssign && !catalog.length && (
            <EmptyContent>
              <Button nativeButton={false} render={<Link href="/materias" />}>
                Ir a materias
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Materia</TableHead>
                <TableHead>Docente</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Horas
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Peso
                </TableHead>
                {canAssign && <TableHead className="w-12 pr-4" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="pl-4">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {assignment.subject.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {assignment.subject.code}
                        {assignment.subject.areaName &&
                          ` · ${assignment.subject.areaName}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {assignment.teacher ? (
                      `${assignment.teacher.firstName} ${assignment.teacher.lastName}`
                    ) : (
                      <span className="text-destructive">Sin docente</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-right tabular-nums sm:table-cell">
                    {assignment.weeklyHours ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-right tabular-nums sm:table-cell">
                    {assignment.weightInGpa}
                  </TableCell>
                  {canAssign && (
                    <TableCell className="pr-4 text-right">
                      <AssignmentRowActions
                        classroomId={classroom.id}
                        assignment={assignment}
                        teachers={teachers}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

export default async function ClassroomPage({
  params,
}: PageProps<'/salones/[classroomId]'>) {
  const { classroomId } = await params;

  return (
    <>
      <PanelHeader
        crumbs={[{ label: 'Salones', href: '/salones' }, { label: 'Salón' }]}
        yearSelector
      />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <ClassroomLoad classroomId={classroomId} />
        </Suspense>
      </PanelContent>
    </>
  );
}
