import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PresentationIcon, TableIcon, UsersIcon } from 'lucide-react';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import {
  CLASSROOM_SUBJECT_GRANTS,
  ENROLLMENT_GRANTS,
  canOpenGradebooks,
  isGranted,
} from '@/lib/auth/permissions';

export const metadata: Metadata = { title: 'Mis clases' };

type Classroom = {
  id: string;
  name: string;
  gradeLevel: { name: string } | null;
};

type Assignment = {
  id: string;
  weeklyHours: number | null;
  subject: {
    id: string;
    name: string;
    code: string;
    areaName: string | null;
  };
  classroom: Classroom;
};

// Contrato de GET /teaching-assignments.
type TeachingAssignments = {
  academicYear: { id: string; name: string; status: 'open' | 'closed' } | null;
  assignments: Assignment[];
  // Salones donde es director de grupo.
  homerooms: Classroom[];
};

type Group = {
  classroom: Classroom;
  subjects: Assignment[];
  homeroom: boolean;
};

// Agrupa por salón: primero las direcciones de grupo y luego los salones
// donde solo dicta, conservando el orden de la API (grado y nombre).
const byClassroom = ({
  assignments,
  homerooms,
}: Pick<TeachingAssignments, 'assignments' | 'homerooms'>) => {
  const groups = new Map<string, Group>(
    homerooms.map((classroom) => [
      classroom.id,
      { classroom, subjects: [], homeroom: true },
    ]),
  );
  for (const assignment of assignments) {
    const group = groups.get(assignment.classroom.id) ?? {
      classroom: assignment.classroom,
      subjects: [],
      homeroom: false,
    };
    group.subjects.push(assignment);
    groups.set(assignment.classroom.id, group);
  }
  return [...groups.values()];
};

async function MyClasses() {
  // Solo para profesores: ven únicamente sus salones y materias.
  const me = await requireGrant(CLASSROOM_SUBJECT_GRANTS.mine);
  const canSeeStudents = isGranted(me, ENROLLMENT_GRANTS.classes);
  const canGrade = canOpenGradebooks(me);

  const { academicYear, assignments, homerooms } =
    await authFetch<TeachingAssignments>('/teaching-assignments');

  if (!academicYear || (!assignments.length && !homerooms.length))
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PresentationIcon />
          </EmptyMedia>
          <EmptyTitle>Sin clases asignadas</EmptyTitle>
          <EmptyDescription>
            {academicYear
              ? `Aún no tienes materias asignadas en ${academicYear.name}. El administrador de tu colegio las asigna desde cada salón.`
              : 'Tu colegio todavía no tiene un año lectivo activo.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  const groups = byClassroom({ assignments, homerooms });
  const totalHours = assignments.reduce(
    (sum, { weeklyHours }) => sum + (weeklyHours ?? 0),
    0,
  );

  return (
    <>
      <p className="text-muted-foreground text-sm">
        Año lectivo{' '}
        <span className="text-foreground font-medium">{academicYear.name}</span>{' '}
        · {groups.length} salones · {assignments.length} materias
        {totalHours ? ` · ${totalHours} horas semanales` : ''}
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(({ classroom, subjects, homeroom }) => (
          <Card key={classroom.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                {classroom.name}
                {homeroom && (
                  <Badge variant="secondary">Director de grupo</Badge>
                )}
              </CardTitle>
              <CardDescription>{classroom.gradeLevel?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {!subjects.length && (
                <p className="text-muted-foreground text-sm">
                  No dictas materias en este salón.
                </p>
              )}
              <ul className="flex flex-col gap-2">
                {subjects.map(({ id, subject, weeklyHours }) => (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{subject.code}</Badge>
                      {canGrade ? (
                        <Link
                          href={`/planillas/${id}`}
                          className="hover:underline"
                        >
                          {subject.name}
                        </Link>
                      ) : (
                        subject.name
                      )}
                    </span>
                    {weeklyHours && (
                      <span className="text-muted-foreground tabular-nums">
                        {weeklyHours} h
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
            {(canSeeStudents || (canGrade && subjects.length > 0)) && (
              <CardFooter className="flex flex-wrap gap-2">
                {canGrade && subjects.length === 1 && (
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/planillas/${subjects[0].id}`} />}
                  >
                    <TableIcon data-icon="inline-start" />
                    Calificar
                  </Button>
                )}
                {canSeeStudents && (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/mis-clases/${classroom.id}`} />}
                  >
                    <UsersIcon data-icon="inline-start" />
                    {homeroom && canGrade
                      ? 'Estudiantes y planillas'
                      : 'Ver estudiantes'}
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}

export default function MyClassesPage() {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Mis clases' }]} yearSelector />
      <PanelContent>
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          }
        >
          <MyClasses />
        </Suspense>
      </PanelContent>
    </>
  );
}
