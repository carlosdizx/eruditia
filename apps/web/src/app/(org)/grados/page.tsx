import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  ArrowRightIcon,
  CircleAlertIcon,
  GraduationCapIcon,
  LayersIcon,
} from 'lucide-react';
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
import { GRADE_LEVEL_GRANTS, isGranted } from '@/lib/auth/permissions';
import { CreateGradeLevelDialog } from './_components/create-grade-level-dialog';
import { GradeLevelRowActions } from './_components/grade-level-row-actions';
import { LoadStandardButton } from './_components/load-standard-button';
import type { GradeLevel } from './types';

export const metadata: Metadata = { title: 'Grados' };

// A dónde promueve cada grado: al de sequenceOrder + 1, o gradúa si es el último.
function Promotion({
  gradeLevel,
  bySequence,
}: {
  gradeLevel: GradeLevel;
  bySequence: Map<number, GradeLevel>;
}) {
  if (gradeLevel.isFinalGrade)
    return (
      <span className="flex items-center gap-1.5">
        <GraduationCapIcon className="size-4" />
        Se gradúa
      </span>
    );

  const next = bySequence.get(gradeLevel.sequenceOrder + 1);

  return next ? (
    <span className="flex items-center gap-1.5">
      <ArrowRightIcon className="size-4" />
      {next.name}
    </span>
  ) : (
    <span className="text-destructive flex items-center gap-1.5">
      <CircleAlertIcon className="size-4" />
      Sin grado siguiente (orden {gradeLevel.sequenceOrder + 1})
    </span>
  );
}

async function GradeLevelsTable() {
  // Sin el permiso (y el rol que exige la API) no puede ver esta sección.
  const me = await requireGrant(GRADE_LEVEL_GRANTS.list);

  const can = {
    create: isGranted(me, GRADE_LEVEL_GRANTS.create),
    update: isGranted(me, GRADE_LEVEL_GRANTS.update),
    delete: isGranted(me, GRADE_LEVEL_GRANTS.delete),
  };

  const gradeLevels = await authFetch<GradeLevel[]>('/grade-levels');
  const bySequence = new Map(
    gradeLevels.map((gradeLevel) => [gradeLevel.sequenceOrder, gradeLevel]),
  );
  const nextOrder = gradeLevels.length
    ? gradeLevels[gradeLevels.length - 1].sequenceOrder + 1
    : 1;

  const actions = can.create && (
    <div className="flex flex-col gap-2 sm:flex-row">
      <LoadStandardButton />
      <CreateGradeLevelDialog nextOrder={nextOrder} />
    </div>
  );

  if (!gradeLevels.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayersIcon />
          </EmptyMedia>
          <EmptyTitle>Sin grados</EmptyTitle>
          <EmptyDescription>
            Carga la plantilla estándar (Transición, Primaria 1° a 5° y
            Bachillerato 6° a 11°) o crea tus grados uno a uno.
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
              <TableHead className="w-16 pl-4">Orden</TableHead>
              <TableHead>Grado</TableHead>
              <TableHead className="hidden sm:table-cell">Promueve a</TableHead>
              {showActions && <TableHead className="w-12 pr-4" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {gradeLevels.map((gradeLevel) => (
              <TableRow key={gradeLevel.id}>
                <TableCell className="text-muted-foreground pl-4 tabular-nums">
                  {gradeLevel.sequenceOrder}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="min-w-10 justify-center"
                    >
                      {gradeLevel.shortName}
                    </Badge>
                    <span className="font-medium">{gradeLevel.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  <Promotion gradeLevel={gradeLevel} bySequence={bySequence} />
                </TableCell>
                {showActions && (
                  <TableCell className="pr-4 text-right">
                    <GradeLevelRowActions
                      gradeLevel={gradeLevel}
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

export default function GradeLevelsPage() {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Grados' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <GradeLevelsTable />
        </Suspense>
      </PanelContent>
    </>
  );
}
