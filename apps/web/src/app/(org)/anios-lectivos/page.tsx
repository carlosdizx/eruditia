import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CalendarRangeIcon } from 'lucide-react';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
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
import { ACADEMIC_YEAR_GRANTS, isGranted } from '@/lib/auth/permissions';
import { formatDate } from '@/lib/format';
import { AcademicYearActions } from './_components/academic-year-actions';
import { CreateAcademicYearDialog } from './_components/create-academic-year-dialog';
import { PeriodGradingSwitch } from './_components/period-grading-switch';
import type { AcademicYear } from './types';

export const metadata: Metadata = { title: 'Años lectivos' };

// DATEONLY llega como AAAA-MM-DD: se fija la hora para que la zona horaria
// no la corra al día anterior.
const formatDay = (value: string) => formatDate(`${value}T12:00:00`);

function AcademicYearCard({
  year,
  can,
}: {
  year: AcademicYear;
  can: { update: boolean; delete: boolean };
}) {
  const closed = year.status === 'closed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {year.name}
          {year.isActive && <Badge>Activo</Badge>}
          <Badge variant={closed ? 'outline' : 'secondary'}>
            {closed ? 'Cerrado' : 'Abierto'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {formatDay(year.startDate)} – {formatDay(year.endDate)}
        </CardDescription>
        {(can.update || can.delete) && (
          <CardAction>
            <AcademicYearActions
              year={year}
              canUpdate={can.update}
              canDelete={can.delete}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-3">#</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">Peso</TableHead>
                <TableHead className="pr-3 text-right">
                  Ingreso de notas
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {year.periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="text-muted-foreground pl-3 tabular-nums">
                    {period.orderIndex}
                  </TableCell>
                  <TableCell className="font-medium">{period.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {period.weightPercentage}%
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    {can.update ? (
                      <PeriodGradingSwitch
                        yearId={year.id}
                        period={period}
                        disabled={closed}
                      />
                    ) : (
                      <Badge
                        variant={
                          period.isOpenForGrading ? 'secondary' : 'outline'
                        }
                      >
                        {period.isOpenForGrading ? 'Abierto' : 'Cerrado'}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

async function AcademicYears() {
  // Sin el permiso (y el rol que exige la API) no puede ver esta sección.
  const me = await requireGrant(ACADEMIC_YEAR_GRANTS.list);

  const can = {
    create: isGranted(me, ACADEMIC_YEAR_GRANTS.create),
    update: isGranted(me, ACADEMIC_YEAR_GRANTS.update),
    delete: isGranted(me, ACADEMIC_YEAR_GRANTS.delete),
  };

  const years = await authFetch<AcademicYear[]>('/academic-years');

  // Propone el año siguiente al más reciente, o el actual.
  const latest = Number(years[0]?.name);
  const suggestedName = String(
    Number.isInteger(latest) ? latest + 1 : new Date().getFullYear(),
  );
  const createButton = can.create && (
    <CreateAcademicYearDialog suggestedName={suggestedName} />
  );

  if (!years.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarRangeIcon />
          </EmptyMedia>
          <EmptyTitle>Sin años lectivos</EmptyTitle>
          <EmptyDescription>
            Crea el año escolar y divídelo en periodos para empezar a organizar
            salones y notas.
          </EmptyDescription>
        </EmptyHeader>
        {createButton && <EmptyContent>{createButton}</EmptyContent>}
      </Empty>
    );

  return (
    <>
      {createButton && <div className="flex justify-end">{createButton}</div>}
      <div className="grid gap-4 xl:grid-cols-2">
        {years.map((year) => (
          <AcademicYearCard key={year.id} year={year} can={can} />
        ))}
      </div>
    </>
  );
}

function AcademicYearsSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

export default function AcademicYearsPage() {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Años lectivos' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<AcademicYearsSkeleton />}>
          <AcademicYears />
        </Suspense>
      </PanelContent>
    </>
  );
}
