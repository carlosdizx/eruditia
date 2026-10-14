import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Building2Icon, PlusIcon } from 'lucide-react';
import { ListPagination } from '@/components/data/list-pagination';
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
import { authFetch } from '@/lib/api/auth-fetch';
import { DEFAULT_PAGE_SIZE, parsePage, type Paginated } from '@/lib/api/types';
import { requireSuperAdmin } from '@/lib/auth/current-user';
import { formatDate } from '@/lib/format';
import { OrganizationRowActions } from './_components/organization-row-actions';
import type { Organization } from './types';

export const metadata: Metadata = { title: 'Organizaciones' };

const BASE_PATH = '/admin/organizaciones';

function NewOrganizationButton() {
  return (
    <Button nativeButton={false} render={<Link href={`${BASE_PATH}/nueva`} />}>
      <PlusIcon data-icon="inline-start" />
      Nueva organización
    </Button>
  );
}

async function OrganizationsTable({
  searchParams,
}: {
  searchParams: PageProps<'/admin/organizaciones'>['searchParams'];
}) {
  await requireSuperAdmin();

  const page = parsePage((await searchParams).page);
  const { data, meta } = await authFetch<Paginated<Organization>>(
    `/organizations?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`,
  );

  if (!data.length)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2Icon />
          </EmptyMedia>
          <EmptyTitle>Sin organizaciones</EmptyTitle>
          <EmptyDescription>
            Registra la primera organización y su administrador.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <NewOrganizationButton />
        </EmptyContent>
      </Empty>
    );

  return (
    <>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Organización</TableHead>
              <TableHead className="hidden md:table-cell">Contacto</TableHead>
              <TableHead className="hidden lg:table-cell">Ubicación</TableHead>
              <TableHead className="hidden sm:table-cell">Creada</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((organization) => (
              <TableRow key={organization.id}>
                <TableCell className="pl-4">
                  <div className="flex flex-col">
                    <Link
                      href={`${BASE_PATH}/${organization.id}`}
                      className="font-medium hover:underline"
                    >
                      {organization.name}
                    </Link>
                    <code className="text-muted-foreground text-xs">
                      {organization.slug}
                    </code>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {organization.email ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground hidden lg:table-cell">
                  {[organization.city, organization.country]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground hidden sm:table-cell">
                  {formatDate(organization.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={organization.isActive ? 'secondary' : 'outline'}
                  >
                    {organization.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <OrganizationRowActions
                    id={organization.id}
                    name={organization.name}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListPagination meta={meta} basePath={BASE_PATH} />
    </>
  );
}

export default function OrganizationsPage({
  searchParams,
}: PageProps<'/admin/organizaciones'>) {
  return (
    <>
      <PanelHeader
        crumbs={[{ label: 'Administración' }, { label: 'Organizaciones' }]}
        actions={<NewOrganizationButton />}
      />
      <PanelContent>
        <Suspense fallback={<TableSkeleton />}>
          <OrganizationsTable searchParams={searchParams} />
        </Suspense>
      </PanelContent>
    </>
  );
}
