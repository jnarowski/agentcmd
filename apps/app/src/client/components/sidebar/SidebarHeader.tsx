import { Command } from "lucide-react";
import { Link } from "react-router-dom";
import {
  SidebarHeader,
} from "@/client/components/ui/sidebar";

export function AppSidebarHeader() {
  return (
    <SidebarHeader className="border-b h-[69px]">
      <div className="flex items-center justify-between gap-2 px-2 h-full">
        <Link to="/projects" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Command className="size-5" />
          <span className="text-lg font-semibold">agentcmd</span>
        </Link>
      </div>
    </SidebarHeader>
  );
}
