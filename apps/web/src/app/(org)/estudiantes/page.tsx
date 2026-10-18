import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { GraduationCapIcon, SearchXIcon } from 'lucide-react';
import { ListPagination } from '@/components/data/list-pagination';
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
import { DEFAULT_PAGE_SIZE, parsePage, type Paginated } from '@/lib/api/types';
import { requireGrant } from '@/lib/auth/current-user';
import { isGranted, STUDENT_GRANTS } from '@/lib/auth/permissions';
import { CreateStudentDialog } from './_components/create-student-dialog';
import { ImportStudentsDialog } from './_components/import-students-dialog';
import { StudentRowActions } from './_components/student-row-actions';
import { StudentsFilter } from './_components/students-filter';
import {
  parseStatusFilter,
  STUDENT_STATUS_LABELS,
  type Student,
  type StudentStatus,
} from './types';

export const metadata: Metadata = { title: 'Estudiantes' };

const BASE_PATH = '/estudiantes';

const STATUS_VARIANTS: Record<
  StudentStatus,
  'secondary' | 'outline' | 'destructive' | 'default'
> = {
  active: 'secondary',
  graduated: 'default',
  withdrawn: 'outline',
  suspended: 'destructive',
};

function StudentAccess({ student }: { student: Student }) {
  if (student.user)
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge variant={student.user.isActive ? 'secondary' : 'outline'}>
          Cuenta
        </Badge>
        <span className="text-muted-foreground max-w-40 truncate text-xs">
          {student.user.email}
        </span>
      </div>
    );

  return <span className="text-muted-foreground text-xs">Sin cuenta</span>;
}

async function StudentsTable({
  searchParams,
}: {
  searchParams: PageProps<'/estudiantes'>['searchParams'];
}) {
  // Sin el permiso (y el rol que exige la API) no puede ver esta sección.
  const me = await requireGrant(STUDENT_GRANTS.list);

  const can = {
    create: isGranted(me, STUDENT_GRANTS.create),
    update: isGranted(me, STUDENT_GRANTS.update),
    import: isGranted(me, STUDENT_GRANTS.import),
  };

  const params = await searchParams;
  const page = parsePage(params.page);
  const search = typeof params.search === 'string' ? params.search.trim() : '';
  const status = parseStatusFilter(params.status);

  const filters = {
    ...(search && { search }),
    ...(status && { status }),
  };

  const { data, meta } = await authFetch<Paginated<Student>>(
    `/students?${new URLSearchParams({
      page: String(page),
      pageSize: String(DEFAULT_PAGE_SIZE),
      ...filters,
    })}`,
  );

  const createButtons = (can.create || can.import) && (
    <div className="flex flex-col gap-2 sm:flex-row">
      {can.import && <ImportStudentsDialog />}
      {can.create && <CreateStudentDialog />}
    </div>
  );
  const filtered = Object.keys(filters).length > 0;

  const toolbar = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <StudentsFilter basePath={BASE_PATH} search={search} status={status} />
      </div>
      {createButtons}
    </div>
  );

  if (!data.length)
    return filtered ? (
      <>
        {toolbar}
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              Ningún estudiante coincide con los filtros.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    ) : (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GraduationCapIcon />
          </EmptyMedia>
          <EmptyTitle>Sin estudiantes</EmptyTitle>
          <EmptyDescription>
            Tu organización todavía no tiene estudiantes matriculados.
          </EmptyDescription>
        </EmptyHeader>
        {createButtons && <EmptyContent>{createButtons}</EmptyContent>}
      </Empty>
    );

  return (
    <>
      {toolbar}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Estudiante</TableHead>
              <TableHead className="hidden sm:table-cell">Documento</TableHead>
              <TableHead className="hidden lg:table-cell">Código</TableHead>
              <TableHead className="hidden md:table-cell">Acudiente</TableHead>
              <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
              <TableHead>Estado</TableHead>
              {can.update && <TableHead className="w-12 pr-4" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="pl-4">
                  <div className="flex flex-col">
                    <Link
                      href={`${BASE_PATH}/${student.id}`}
                      className="font-medium hover:underline"
                    >
                      {student.lastName}, {student.firstName}
                    </Link>
                    <span className="text-muted-foreground text-xs sm:hidden">
                      {student.documentType} {student.documentNumber}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {student.documentType} {student.documentNumber}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">
                  <code className="text-xs">{student.studentCode}</code>
                </TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {student.guardianName ? (
                    <div className="flex flex-col">
                      <span>{student.guardianName}</span>
                      {student.guardianPhone && (
                        <span className="text-xs">{student.guardianPhone}</span>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <StudentAccess student={student} />
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[student.status]}>
                    {STUDENT_STATUS_LABELS[student.status]}
                  </Badge>
                </TableCell>
                {can.update && (
                  <TableCell className="pr-4 text-right">
                    <StudentRowActions student={student} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListPagination meta={meta} basePath={BASE_PATH} query={filters} />
    </>
  );
}

export default function StudentsPage({
  searchParams,
}: PageProps<'/estudiantes'>) {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Estudiantes' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <StudentsTable searchParams={searchParams} />
        </Suspense>
      </PanelContent>
    </>
  );
}
