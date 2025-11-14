import { SidebarTrigger } from "@/client/components/ui/sidebar";
import { Separator } from "@/client/components/ui/separator";

interface AppHeaderProps {
  title: string;
}

/**
 * Simple header for pages without an active project.
 * Shows sidebar trigger on mobile only.
 */
export function AppHeader({ title }: AppHeaderProps) {
  return (
    <div className="md:hidden flex items-center gap-2 border-b px-4 py-3">
      <SidebarTrigger className="shrink-0" />
      <Separator orientation="vertical" className="h-4 shrink-0" />
      <h1 className="text-base font-medium truncate">{title}</h1>
    </div>
  );
}
