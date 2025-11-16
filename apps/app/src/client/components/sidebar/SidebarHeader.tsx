import { Link } from "react-router-dom";
import { SidebarHeader } from "@/client/components/ui/sidebar";
import { Logo } from "@/client/components/Logo";

export function AppSidebarHeader() {
  return (
    <SidebarHeader className="border-b h-[69px]">
      <div className="flex items-center justify-between gap-2 h-full">
        <Link to="/projects" className="hover:opacity-80 transition-opacity">
          <Logo size="sm" />
        </Link>
      </div>
    </SidebarHeader>
  );
}
