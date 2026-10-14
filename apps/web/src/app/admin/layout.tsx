import { Suspense } from 'react';
import { AdminSidebar } from '@/components/panel/panel-sidebar';
import { SidebarSkeleton } from '@/components/panel/sidebar-skeleton';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

// Panel del super admin: no pertenece a una organización.
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <SidebarProvider>
      <Suspense fallback={<SidebarSkeleton />}>
        <AdminSidebar />
      </Suspense>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
