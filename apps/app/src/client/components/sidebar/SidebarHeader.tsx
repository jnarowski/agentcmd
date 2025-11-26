import { SidebarHeader } from "@/client/components/ui/sidebar";
import { Logo } from "@/client/components/Logo";
import { getWebsiteUrl } from "@/client/utils/envConfig";

export function AppSidebarHeader() {
  return (
    <SidebarHeader className="border-b h-[69px]">
      <div className="flex items-center justify-between gap-2 h-full">
        <a
          href={getWebsiteUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity pointer-events-none md:pointer-events-auto"
        >
          <Logo size="sm" />
        </a>
      </div>
    </SidebarHeader>
  );
}
