import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

// Anchos fijos: SidebarMenuSkeleton usa Math.random(), que Cache Components no
// permite en el prerender del fallback.
const ITEM_WIDTHS = ['70%', '55%', '80%'];

export function SidebarSkeleton() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Skeleton className="h-12 w-full rounded-lg" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {ITEM_WIDTHS.map((width) => (
              <SidebarMenuItem
                key={width}
                className="flex h-8 items-center gap-2 px-2"
              >
                <Skeleton className="size-4 rounded-md" />
                <Skeleton className="h-4" style={{ width }} />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Skeleton className="h-12 w-full rounded-lg" />
      </SidebarFooter>
    </Sidebar>
  );
}
