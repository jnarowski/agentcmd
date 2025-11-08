import { Command } from "lucide-react";
import { SidebarHeader, SidebarMenu, SidebarMenuItem } from "@/client/components/ui/sidebar";

export function AppSidebarHeader() {
  return (
    <SidebarHeader className="py-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Command className="size-4" />
            <span className="text-base font-semibold">agentcmd</span>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
