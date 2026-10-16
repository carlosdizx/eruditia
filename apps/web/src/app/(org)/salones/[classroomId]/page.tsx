import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { BookOpenIcon, LockIcon, TrendingUpIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSelectedAcademicYear } from '@/lib/academic-year/selected-year';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import {
  CLASSROOM_GRANTS,
  CLASSROOM_SUBJECT_GRANTS,
  ENROLLMENT_GRANTS,
  canOpenGradebooks,
  isGranted,
  SUBJECT_GRANTS,
} from '@/lib/auth/permissions';
import type { Classroom, Teacher } from '../types';
import {
  AssignmentRowActions,
  AssignSubjectDialog,
} from './_components/assignment-actions';
import type { SubjectOption } from './_components/assignment-form';
import { EnrollmentsSection } from './_components/enrollments-section';
import type { ClassroomSubject, Enrollment, EnrollmentStudent } from './types';

export const metadata: Metadata = { title: 'Salón' };

function NoAccess() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LockIcon />
        </EmptyMedia>
        <EmptyTitle>Sin acceso</EmptyTitle>
        <EmptyDescription>
          Tu organización no tiene habilitado este permiso.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

async function ClassroomLoad({
  params,
}: {
  params: PageProps<'/salones/[classroomId]'>['params'];
}) {
  const { classroomId } = await params;
  const me = await requireGrant(CLASSROOM_GRANTS.list);
  const canListSubjects = isGranted(me, CLASSROOM_SUBJECT_GRANTS.list);
  const canListEnrollments = isGranted(me, ENROLLMENT_GRANTS.list);
  const canOpenGradebook = canOpenGradebooks(me);

  const [classroom, assignments, enrollments, { years }] = await Promise.all([
    authFetch<Classroom>(`/classrooms/${classroomId}`),
    canListSubjects
      ? authFetch<ClassroomSubject[]>(`/classrooms/${classroomId}/subjects`)
      : Promise.resolve([]),
    canListEnrollments
      ? authFetch<Enrollment[]>(`/classrooms/${classroomId}/enrollments`)
      : Promise.resolve([]),
    getSelectedAcademicYear(),
  ]);

  const year = years.find(({ id }) => id === classroom.academicYearId);
  const closed = year?.status === 'closed';
  // Un año cerrado es historial: solo lectura.
  const canAssign =
    !closed &&
    canListSubjects &&
    isGranted(me, CLASSROOM_SUBJECT_GRANTS.assign);
  const editableEnrollments = !closed && canListEnrollments;
  const canEnroll =
    editableEnrollments && isGranted(me, ENROLLMENT_GRANTS.create);
  const canUpdateEnrollments =
    editableEnrollments && isGranted(me, ENROLLMENT_GRANTS.update);
  const canDeleteEnrollments =
    editableEnrollments && isGranted(me, ENROLLMENT_GRANTS.delete);
  const canPromote = isGranted(me, ENROLLMENT_GRANTS.promote);

  const [catalog, teachers, candidates, yearClassrooms] = await Promise.all([
    canAssign && isGranted(me, SUBJECT_GRANTS.list)
      ? authFetch<SubjectOption[]>('/subjects')
      : Promise.resolve([]),
    canAssign
      ? authFetch<Teacher[]>('/classrooms/teachers')
      : Promise.resolve([]),
    canEnroll
      ? authFetch<EnrollmentStudent[]>(
          `/classrooms/${classroomId}/enrollments/candidates`,
        )
      : Promise.resolve([]),
    canUpdateEnrollments
      ? authFetch<Classroom[]>(
          `/classrooms?academicYearId=${classroom.academicYearId}`,
        )
      : Promise.resolve([]),
  ]);

  const siblings = yearClassrooms.filter(({ id }) => id !== classroom.id);
  const inProgress = enrollments.filter(
    ({ status }) => status === 'in_progress',
  ).length;

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
          {canPromote && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    href={`/promocion?${new URLSearchParams({
                      sourceYear: classroom.academicYearId,
                      classroom: classroom.id,
                    })}`}
                  />
                }
              >
                <TrendingUpIcon data-icon="inline-start" />
                Promover
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {canListEnrollments && (
            <span>
              <span className="text-foreground font-medium tabular-nums">
                {inProgress}
                {classroom.capacity ? ` / ${classroom.capacity}` : ''}
              </span>{' '}
              estudiantes
            </span>
          )}
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

      <Tabs defaultValue={canListEnrollments ? 'students' : 'subjects'}>
        <TabsList>
          <TabsTrigger value="students">Estudiantes</TabsTrigger>
          <TabsTrigger value="subjects">Carga académica</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="flex flex-col gap-4 pt-2">
          {canListEnrollments ? (
            <EnrollmentsSection
              classroom={classroom}
              enrollments={enrollments}
              candidates={candidates}
              classrooms={siblings}
              canEnroll={canEnroll}
              canUpdate={canUpdateEnrollments}
              canDelete={canDeleteEnrollments}
            />
          ) : (
            <NoAccess />
          )}
        </TabsContent>

        <TabsContent value="subjects" className="flex flex-col gap-4 pt-2">
          {!canListSubjects ? (
            <NoAccess />
          ) : (
            <>
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
                      <Button
                        nativeButton={false}
                        render={<Link href="/materias" />}
                      >
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
                              {canOpenGradebook ? (
                                <Link
                                  href={`/planillas/${assignment.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {assignment.subject.name}
                                </Link>
                              ) : (
                                <span className="font-medium">
                                  {assignment.subject.name}
                                </span>
                              )}
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
                              <span className="text-destructive">
                                Sin docente
                              </span>
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
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

// params se espera dentro del Suspense para no bloquear la navegación.
export default function ClassroomPage({
  params,
}: PageProps<'/salones/[classroomId]'>) {
  return (
    <>
      <PanelHeader
        crumbs={[{ label: 'Salones', href: '/salones' }, { label: 'Salón' }]}
        yearSelector
      />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <ClassroomLoad params={params} />
        </Suspense>
      </PanelContent>
    </>
  );
}
