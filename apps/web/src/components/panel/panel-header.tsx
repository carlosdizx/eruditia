import Link from 'next/link';
import { Fragment, Suspense, type ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AcademicYearSwitcher } from './academic-year-switcher';

type Crumb = { label: string; href?: string };

// Header del bloque sidebar-07 de shadcn/ui.
// yearSelector: muestra el selector global de año lectivo (panel de la
// organización).
export function PanelHeader({
  crumbs,
  actions,
  yearSelector = false,
}: {
  crumbs: Crumb[];
  actions?: ReactNode;
  yearSelector?: boolean;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, index) => (
              <Fragment key={crumb.label}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        {(actions || yearSelector) && (
          <div className="ml-auto flex items-center gap-2">
            {yearSelector && (
              <Suspense fallback={null}>
                <AcademicYearSwitcher />
              </Suspense>
            )}
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export function PanelContent({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>;
}
