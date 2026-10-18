import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UsersIcon } from 'lucide-react';
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
import { isGranted, USER_GRANTS } from '@/lib/auth/permissions';
import { CreateUserDialog } from './_components/create-user-dialog';
import { UserRowActions } from './_components/user-row-actions';
import type { AssignableRole, OrganizationUser } from './types';

export const metadata: Metadata = { title: 'Usuarios' };

async function UsersTable({
  searchParams,
}: {
  searchParams: PageProps<'/usuarios'>['searchParams'];
}) {
  // Sin el permiso (y el rol que exige la API) no puede ver esta sección.
  const me = await requireGrant(USER_GRANTS.list);

  const can = {
    create: isGranted(me, USER_GRANTS.create),
    update: isGranted(me, USER_GRANTS.update),
  };

  const page = parsePage((await searchParams).page);
  const [{ data, meta }, roles] = await Promise.all([
    authFetch<Paginated<OrganizationUser>>(
      `/users?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`,
    ),
    // Los roles solo hacen falta para crear o editar.
    can.create || can.update
      ? authFetch<AssignableRole[]>('/roles')
      : Promise.resolve([]),
  ]);

  const createButton = can.create && <CreateUserDialog roles={roles} />;

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
        {createButton && <EmptyContent>{createButton}</EmptyContent>}
      </Empty>
    );

  return (
    <>
      {createButton && <div className="flex justify-end">{createButton}</div>}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Nombre</TableHead>
              <TableHead className="hidden md:table-cell">Correo</TableHead>
              <TableHead className="hidden lg:table-cell">Documento</TableHead>
              <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              {can.update && <TableHead className="w-12 pr-4" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((user) => {
              const isSelf = user.id === me.id;

              return (
                <TableRow key={user.id}>
                  <TableCell className="pl-4">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                        {isSelf && (
                          <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                            (tú)
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs md:hidden">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {user.documentNumber ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {user.phone ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role?.labelEs ?? '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'secondary' : 'outline'}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  {can.update && (
                    <TableCell className="pr-4 text-right">
                      <UserRowActions
                        user={user}
                        roles={roles}
                        isSelf={isSelf}
                      />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
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
      <PanelHeader crumbs={[{ label: 'Usuarios' }]} yearSelector />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <UsersTable searchParams={searchParams} />
        </Suspense>
      </PanelContent>
    </>
  );
}
