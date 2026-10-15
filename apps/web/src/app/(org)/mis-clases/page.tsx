import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PresentationIcon } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { CLASSROOM_SUBJECT_GRANTS } from '@/lib/auth/permissions';

export const metadata: Metadata = { title: 'Mis clases' };

// Contrato de GET /teaching-assignments.
type TeachingAssignments = {
  academicYear: { id: string; name: string; status: 'open' | 'closed' } | null;
  assignments: {
    id: string;
    weeklyHours: number | null;
    subject: {
      id: string;
      name: string;
      code: string;
      areaName: string | null;
    };
    classroom: {
      id: string;
      name: string;
      gradeLevel: { name: string } | null;
    };
  }[];
};

type Assignment = TeachingAssignments['assignments'][number];

// Agrupa por salón conservando el orden de la API (grado y nombre).
const byClassroom = (assignments: Assignment[]) => {
  const groups = new Map<
    string,
    { classroom: Assignment['classroom']; subjects: Assignment[] }
  >();
  for (const assignment of assignments) {
    const group = groups.get(assignment.classroom.id) ?? {
      classroom: assignment.classroom,
      subjects: [],
    };
    group.subjects.push(assignment);
    groups.set(assignment.classroom.id, group);
  }
  return [...groups.values()];
};

async function MyClasses() {
  // Solo para profesores: ven únicamente sus salones y materias.
  await requireGrant(CLASSROOM_SUBJECT_GRANTS.mine);

  const { academicYear, assignments } = await authFetch<TeachingAssignments>(
    '/teaching-assignments',
  );

  if (!academicYear || !assignments.length)
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

  const groups = byClassroom(assignments);
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
        {groups.map(({ classroom, subjects }) => (
          <Card key={classroom.id}>
            <CardHeader>
              <CardTitle className="text-lg">{classroom.name}</CardTitle>
              <CardDescription>{classroom.gradeLevel?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {subjects.map(({ id, subject, weeklyHours }) => (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">{subject.code}</Badge>
                      {subject.name}
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
