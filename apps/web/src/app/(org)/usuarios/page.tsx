import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UsersIcon } from 'lucide-react';
import { ListPagination } from '@/components/data/list-pagination';
import { TableSkeleton } from '@/components/data/table-skeleton';
import { PanelContent, PanelHeader } from '@/components/panel/panel-header';
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
import { authFetch } from '@/lib/api/auth-fetch';
import { DEFAULT_PAGE_SIZE, parsePage, type Paginated } from '@/lib/api/types';
import { requirePermission } from '@/lib/auth/current-user';
import { Permission } from '@/lib/auth/permissions';

export const metadata: Metadata = { title: 'Usuarios' };

type OrganizationUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
};

async function UsersTable({
  searchParams,
}: {
  searchParams: PageProps<'/usuarios'>['searchParams'];
}) {
  // Sin el permiso en su organización, no puede ver esta sección.
  await requirePermission(Permission.USER_LIST);

  const page = parsePage((await searchParams).page);
  const { data, meta } = await authFetch<Paginated<OrganizationUser>>(
    `/users?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`,
  );

  if (!data.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>Sin usuarios</EmptyTitle>
          <EmptyDescription>
            Tu organización todavía no tiene usuarios registrados.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead className="pr-4 text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="pl-4 font-medium">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Badge variant={user.isActive ? 'secondary' : 'outline'}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListPagination meta={meta} basePath="/usuarios" />
    </>
  );
}

export default function UsersPage({ searchParams }: PageProps<'/usuarios'>) {
  return (
    <>
      <PanelHeader crumbs={[{ label: 'Usuarios' }]} />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <UsersTable searchParams={searchParams} />
        </Suspense>
      </PanelContent>
    </>
  );
}
