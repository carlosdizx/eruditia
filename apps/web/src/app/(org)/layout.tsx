import { Suspense } from 'react';
import { OrgSidebar } from '@/components/panel/panel-sidebar';
import { SidebarSkeleton } from '@/components/panel/sidebar-skeleton';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

// Panel de los usuarios que pertenecen a una organización.
export default function OrgLayout({ children }: LayoutProps<'/'>) {
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <OrgSidebar />
      </Suspense>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
