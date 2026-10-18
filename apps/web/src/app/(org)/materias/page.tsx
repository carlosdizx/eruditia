import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BookOpenIcon } from 'lucide-react';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
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
import { authFetch } from '@/lib/api/auth-fetch';
import { requireGrant } from '@/lib/auth/current-user';
import { isGranted, SUBJECT_GRANTS } from '@/lib/auth/permissions';
import {
  CreateSubjectDialog,
  LoadStandardSubjectsButton,
  SubjectRowActions,
} from './_components/subject-actions';
import type { Subject } from './types';

export const metadata: Metadata = { title: 'Materias' };

async function SubjectsTable() {
  // Sin el permiso (y el rol que exige la API) no puede ver esta sección.
  const me = await requireGrant(SUBJECT_GRANTS.list);

  const can = {
    create: isGranted(me, SUBJECT_GRANTS.create),
    update: isGranted(me, SUBJECT_GRANTS.update),
    delete: isGranted(me, SUBJECT_GRANTS.delete),
  };

  const subjects = await authFetch<Subject[]>('/subjects');
  const areas = [
    ...new Set(
      subjects.flatMap(({ areaName }) => (areaName ? [areaName] : [])),
    ),
  ].sort();

  const actions = can.create && (
    <div className="flex flex-col gap-2 sm:flex-row">
      <LoadStandardSubjectsButton />
      <CreateSubjectDialog areas={areas} />
    </div>
  );

  if (!subjects.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenIcon />
          </EmptyMedia>
          <EmptyTitle>Sin materias</EmptyTitle>
          <EmptyDescription>
            Carga las materias base de las áreas obligatorias o crea las tuyas.
          </EmptyDescription>
        </EmptyHeader>
        {actions && <EmptyContent>{actions}</EmptyContent>}
      </Empty>
    );

  const showActions = can.update || can.delete;

  return (
    <>
      {actions && <div className="flex justify-end">{actions}</div>}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24 pl-4">Código</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead className="hidden md:table-cell">Área</TableHead>
              {showActions && <TableHead className="w-12 pr-4" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="pl-4">
                  <Badge variant="outline">{subject.code}</Badge>
                </TableCell>
                <TableCell className="font-medium">{subject.name}</TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {subject.areaName ?? '—'}
                </TableCell>
                {showActions && (
                  <TableCell className="pr-4 text-right">
                    <SubjectRowActions
                      subject={subject}
                      areas={areas}
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

export default function SubjectsPage() {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Materias' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <SubjectsTable />
        </Suspense>
      </PanelContent>
    </>
  );
}
