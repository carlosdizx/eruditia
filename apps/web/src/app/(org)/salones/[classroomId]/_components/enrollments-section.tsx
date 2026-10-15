import { UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import type { Classroom } from '../../types';
import {
  ENROLLMENT_STATUS_LABELS,
  type Enrollment,
  type EnrollmentStudent,
} from '../types';
import { EnrollStudentsDialog } from './enroll-students-dialog';
import { EnrollmentRowActions } from './enrollment-row-actions';

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// Lista de clase del salón: también muestra a los retirados y trasladados.
export function EnrollmentsSection({
  classroom,
  enrollments,
  candidates,
  classrooms,
  canEnroll,
  canUpdate,
  canDelete,
}: {
  classroom: Classroom;
  enrollments: Enrollment[];
  candidates: EnrollmentStudent[];
  // Los demás salones del año, para cambiar de salón.
  classrooms: { id: string; name: string }[];
  canEnroll: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const inProgress = enrollments.filter(
    ({ status }) => status === 'in_progress',
  ).length;
  const available = classroom.capacity
    ? Math.max(classroom.capacity - inProgress, 0)
    : null;
  const withActions = canUpdate || canDelete;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold">Lista de clase</h2>
        {canEnroll && (
          <EnrollStudentsDialog
            classroom={classroom}
            candidates={candidates}
            available={available}
          />
        )}
      </div>

      {!enrollments.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>Sin estudiantes</EmptyTitle>
            <EmptyDescription>
              Matricula a los estudiantes que cursan este año en el salón.
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
                <TableHead className="hidden md:table-cell">
                  Matriculado
                </TableHead>
                <TableHead>Estado</TableHead>
                {withActions && <TableHead className="w-12 pr-4" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="pl-4">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {enrollment.student.lastName}{' '}
                        {enrollment.student.firstName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        Código {enrollment.student.studentCode}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {enrollment.student.documentType}{' '}
                    {enrollment.student.documentNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {formatDate(enrollment.enrollmentDate)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        enrollment.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                      }
                      title={enrollment.promotionNotes ?? undefined}
                    >
                      {ENROLLMENT_STATUS_LABELS[enrollment.status]}
                    </Badge>
                  </TableCell>
                  {withActions && (
                    <TableCell className="pr-4 text-right">
                      <EnrollmentRowActions
                        classroomId={classroom.id}
                        enrollment={enrollment}
                        classrooms={classrooms}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
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
