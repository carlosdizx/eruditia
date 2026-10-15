import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CalendarRangeIcon, DoorOpenIcon, LockIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  GRADE_LEVEL_GRANTS,
  isGranted,
} from '@/lib/auth/permissions';
import { ClassroomRowActions } from './_components/classroom-row-actions';
import { CopyStructureDialog } from './_components/copy-structure-dialog';
import { CreateClassroomDialog } from './_components/create-classroom-dialog';
import type { Classroom, GradeLevelOption, Teacher } from './types';

export const metadata: Metadata = { title: 'Salones' };

function MissingYear({ allowed }: { allowed: boolean }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarRangeIcon />
        </EmptyMedia>
        <EmptyTitle>Sin año lectivo</EmptyTitle>
        <EmptyDescription>
          {allowed
            ? 'Los salones pertenecen a un año lectivo: crea uno primero.'
            : 'Necesitas el permiso para ver años lectivos y poder elegir el año de los salones.'}
        </EmptyDescription>
      </EmptyHeader>
      {allowed && (
        <EmptyContent>
          <Button nativeButton={false} render={<Link href="/anios-lectivos" />}>
            Ir a años lectivos
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

async function ClassroomsTable() {
  // Sin el permiso (y el rol que exige la API) no puede ver esta sección.
  const me = await requireGrant(CLASSROOM_GRANTS.list);
  const { allowed, years, selected: year } = await getSelectedAcademicYear();

  if (!year) return <MissingYear allowed={allowed} />;

  const closed = year.status === 'closed';
  const can = {
    // Un año cerrado es historial: solo lectura.
    create: !closed && isGranted(me, CLASSROOM_GRANTS.create),
    update: !closed && isGranted(me, CLASSROOM_GRANTS.update),
    delete: !closed && isGranted(me, CLASSROOM_GRANTS.delete),
  };
  const edits = can.create || can.update;
  const otherYears = years.filter(({ id }) => id !== year.id);
  const canCopy =
    can.create &&
    isGranted(me, CLASSROOM_SUBJECT_GRANTS.assign) &&
    otherYears.length > 0;

  const [classrooms, gradeLevels, teachers] = await Promise.all([
    authFetch<Classroom[]>(`/classrooms?academicYearId=${year.id}`),
    // Grados y profesores solo hacen falta para crear o editar.
    edits && isGranted(me, GRADE_LEVEL_GRANTS.list)
      ? authFetch<GradeLevelOption[]>('/grade-levels')
      : Promise.resolve([]),
    edits ? authFetch<Teacher[]>('/classrooms/teachers') : Promise.resolve([]),
  ]);

  const usedNames = classrooms.map(({ name }) => name);
  const createButton = can.create && (
    <CreateClassroomDialog
      academicYear={year}
      gradeLevels={gradeLevels}
      teachers={teachers}
      usedNames={usedNames}
    />
  );

  const toolbar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        Año lectivo{' '}
        <span className="text-foreground font-medium">{year.name}</span>
        {closed && (
          <Badge variant="outline">
            <LockIcon data-icon="inline-start" />
            Cerrado · solo lectura
          </Badge>
        )}
      </p>
      {(createButton || canCopy) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {canCopy && (
            <CopyStructureDialog target={year} sources={otherYears} />
          )}
          {createButton}
        </div>
      )}
    </div>
  );

  if (!classrooms.length)
    return (
      <>
        {toolbar}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DoorOpenIcon />
            </EmptyMedia>
            <EmptyTitle>Sin salones en {year.name}</EmptyTitle>
            <EmptyDescription>
              {can.create && !gradeLevels.length
                ? 'Primero configura los grados de tu colegio.'
                : 'Crea los salones de cada grado (1°A, 1°B…) y asígnales un director de grupo.'}
            </EmptyDescription>
          </EmptyHeader>
          {can.create && !gradeLevels.length && (
            <EmptyContent>
              <Button nativeButton={false} render={<Link href="/grados" />}>
                Ir a grados
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </>
    );

  const showActions = can.update || can.delete;

  return (
    <>
      {toolbar}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Salón</TableHead>
              <TableHead>Grado</TableHead>
              <TableHead className="hidden md:table-cell">
                Director de grupo
              </TableHead>
              <TableHead className="hidden sm:table-cell">Cupo</TableHead>
              {showActions && <TableHead className="w-12 pr-4" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {classrooms.map((classroom) => (
              <TableRow key={classroom.id}>
                <TableCell className="pl-4 font-medium">
                  <Link
                    href={`/salones/${classroom.id}`}
                    className="hover:underline"
                  >
                    {classroom.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {classroom.gradeLevel?.name ?? '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {classroom.homeroomTeacher ? (
                    <div className="flex flex-col">
                      <span>
                        {classroom.homeroomTeacher.firstName}{' '}
                        {classroom.homeroomTeacher.lastName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {classroom.homeroomTeacher.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground hidden tabular-nums sm:table-cell">
                  {classroom.capacity ?? '—'}
                </TableCell>
                {showActions && (
                  <TableCell className="pr-4 text-right">
                    <ClassroomRowActions
                      classroom={classroom}
                      gradeLevels={gradeLevels}
                      teachers={teachers}
                      usedNames={usedNames}
                      canUpdate={can.update}
                      canDelete={can.delete}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function ClassroomsPage() {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Salones' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <ClassroomsTable />
        </Suspense>
      </PanelContent>
    </>
  );
}
