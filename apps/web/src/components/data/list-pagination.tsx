import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import type { Paginated } from '@/lib/api/types';

type ListPaginationProps = {
  meta: Paginated<unknown>['meta'];
  basePath: string;
  // Filtros activos que se conservan al cambiar de página.
  query?: Record<string, string>;
};

// Pagination de shadcn/ui con <Link> para navegar sin recargar la página.
export function ListPagination({
  meta,
  basePath,
  query = {},
}: ListPaginationProps) {
  const hrefFor = (page: number) =>
    `${basePath}?${new URLSearchParams({ ...query, page: String(page) })}`;

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-muted-foreground text-sm">
        {meta.total
          ? `Mostrando ${meta.from}–${meta.to} de ${meta.total}`
          : 'Sin resultados'}
      </p>
      {meta.totalPages > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                disabled={!meta.prevPage}
                nativeButton={false}
                render={
                  meta.prevPage ? (
                    <Link href={hrefFor(meta.prevPage)} />
                  ) : (
                    <span />
                  )
                }
              >
                <ChevronLeftIcon data-icon="inline-start" />
                Anterior
              </Button>
            </PaginationItem>
            <PaginationItem className="text-muted-foreground px-2 text-sm">
              {meta.page} / {meta.totalPages}
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="ghost"
                disabled={!meta.nextPage}
                nativeButton={false}
                render={
                  meta.nextPage ? (
                    <Link href={hrefFor(meta.nextPage)} />
                  ) : (
                    <span />
                  )
                }
              >
                Siguiente
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
