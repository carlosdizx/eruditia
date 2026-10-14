'use client';

import { GraduationCapIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { hasPermission } from '@/lib/auth/permissions';
import { NAV, type PanelKind } from './nav-config';
import { NavMain } from './nav-main';
import { NavUser, type SidebarUser } from './nav-user';

type AppSidebarProps = {
  panel: PanelKind;
  title: string;
  subtitle: string;
  permissions: string[];
  user: SidebarUser;
};

// Basado en el bloque sidebar-07 de shadcn/ui (colapsable a iconos).
export function AppSidebar({
  panel,
  title,
  subtitle,
  permissions,
  user,
}: AppSidebarProps) {
  const { label, items } = NAV[panel];
  const visibleItems = items.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <GraduationCapIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{title}</span>
                <span className="truncate text-xs">{subtitle}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label={label} items={visibleItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
