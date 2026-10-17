import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { EyeIcon, TableIcon, UsersIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { ReportCardLink } from '@/components/grading/report-card-link';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/lib/api/api-fetch';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import {
  ENROLLMENT_GRANTS,
  REPORT_CARD_GRANTS,
  canOpenGradebooks,
  isGranted,
} from '@/lib/auth/permissions';
import type { ClassroomGradebooks } from '../../planillas/types';
import {
  ENROLLMENT_STATUS_LABELS,
  type Enrollment,
} from '../../salones/[classroomId]/types';

export const metadata: Metadata = { title: 'Lista de clase' };

// Solo lo necesario de GET /teaching-assignments para nombrar el salón.
type TeachingAssignments = {
  academicYear: { name: string } | null;
  assignments: {
    classroom: {
      id: string;
      name: string;
      gradeLevel: { name: string } | null;
    };
  }[];
  homerooms: {
    id: string;
    name: string;
    gradeLevel: { name: string } | null;
  }[];
};

async function ClassList({
  params,
}: {
  params: PageProps<'/mis-clases/[classroomId]'>['params'];
}) {
  const { classroomId } = await params;
  // La API solo responde los salones donde el profesor dicta.
  const me = await requireGrant(ENROLLMENT_GRANTS.classes);

  let enrollments: Enrollment[];
  try {
    enrollments = await authFetch<Enrollment[]>(
      `/classrooms/${classroomId}/enrollments`,
    );
  } catch (error) {
    if (error instanceof ApiError && [400, 404].includes(error.status))
      notFound();
    throw error;
  }

  const [{ academicYear, assignments, homerooms }, gradebooks] =
    await Promise.all([
      authFetch<TeachingAssignments>('/teaching-assignments'),
      canOpenGradebooks(me)
        ? authFetch<ClassroomGradebooks>(
            `/classrooms/${classroomId}/gradebooks`,
          ).catch(() => null)
        : null,
    ]);
  // El boletín solo lo previsualiza el director de grupo.
  const canViewReportCards =
    homerooms.some(({ id }) => id === classroomId) &&
    isGranted(me, REPORT_CARD_GRANTS.preview);
  const classroom = [
    ...homerooms,
    ...assignments.map((assignment) => assignment.classroom),
  ].find(({ id }) => id === classroomId);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          {classroom?.name ?? 'Lista de clase'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {[classroom?.gradeLevel?.name, academicYear?.name]
            .filter(Boolean)
            .join(' · ')}
          {classroom ? ' · ' : ''}
          {
            enrollments.filter(({ status }) => status === 'in_progress').length
          }{' '}
          estudiantes cursando
        </p>
      </div>

      {gradebooks && gradebooks.gradebooks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Planillas de notas</h2>
          <div className="flex flex-wrap gap-2">
            {gradebooks.gradebooks.map(
              ({ id, subject, teacher, canManage }) => (
                <Button
                  key={id}
                  size="sm"
                  variant={canManage ? 'default' : 'outline'}
                  title={
                    canManage
                      ? undefined
                      : `Solo lectura${teacher ? ` · Prof. ${teacher.firstName} ${teacher.lastName}` : ''}`
                  }
                  nativeButton={false}
                  render={<Link href={`/planillas/${id}`} />}
                >
                  {canManage ? (
                    <TableIcon data-icon="inline-start" />
                  ) : (
                    <EyeIcon data-icon="inline-start" />
                  )}
                  {subject.name}
                </Button>
              ),
            )}
          </div>
        </section>
      )}

      {!enrollments.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Sin estudiantes</EmptyTitle>
            <EmptyDescription>
              El administrador aún no ha matriculado estudiantes en este salón.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Estudiante</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Documento
                </TableHead>
                <TableHead className="pr-4">Estado</TableHead>
                {canViewReportCards && <TableHead className="pr-4" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/estudiantes/${enrollment.studentId}`}
                      className="font-medium hover:underline"
                    >
                      {enrollment.student.lastName}{' '}
                      {enrollment.student.firstName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {enrollment.student.documentType}{' '}
                    {enrollment.student.documentNumber}
                  </TableCell>
                  <TableCell className="pr-4">
                    <Badge
                      variant={
                        enrollment.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                    </Badge>
                  </TableCell>
                  {canViewReportCards && (
                    <TableCell className="pr-4 text-right">
                      <ReportCardLink
                        enrollmentId={enrollment.id}
                        from={`/mis-clases/${classroomId}`}
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

export default function ClassListPage({
  params,
}: PageProps<'/mis-clases/[classroomId]'>) {
  return (
    <>
      <PanelHeader
        crumbs={[
          { label: 'Mis clases', href: '/mis-clases' },
          { label: 'Lista de clase' },
        ]}
      />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <ClassList params={params} />
        </Suspense>
      </PanelContent>
    </>
  );
}
