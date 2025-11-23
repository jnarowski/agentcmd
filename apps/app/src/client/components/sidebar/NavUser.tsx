import { useState } from "react";
import { BookOpen, ChevronsUpDown, FolderKanban, LogOut, Mail, RefreshCw, Settings } from "lucide-react";
import pkg from "../../../../package.json";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/client/components/ui/sidebar";
import { SettingsDialog } from "@/client/components/SettingsDialog";
import { NewsletterDialog } from "@/client/components/NewsletterDialog";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { useIsPwa } from "@/client/hooks/use-pwa";
import { ReadyState } from "@/shared/types/websocket.types";
import { getWebsiteUrl } from "@/client/utils/envConfig";

export function NavUser({
  user,
  onLogout,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  onLogout?: () => void;
}) {
  const { isMobile } = useSidebar();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const { isConnected, readyState, reconnectAttempt } = useWebSocket();
  const isPwa = useIsPwa();

  const getStatusColor = () => {
    if (isConnected) return "bg-green-500";
    if (readyState === ReadyState.CONNECTING || reconnectAttempt > 0)
      return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (isConnected) return "CONNECTED";
    if (reconnectAttempt > 0) return `RECONNECTING... (${reconnectAttempt}/5)`;
    if (readyState === ReadyState.CONNECTING) return "CONNECTING...";
    return "DISCONNECTED";
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`h-3 w-3 rounded-full ${getStatusColor()} transition-colors flex-shrink-0 ml-0.5`}
                  />
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate text-sm">{user.email}</span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {getStatusText()}
                    </span>
                  </div>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-1 py-1.5 text-left text-sm">
                  <div
                    className={`h-3 w-3 rounded-full ${getStatusColor()} transition-colors flex-shrink-0 ml-0.5`}
                  />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="truncate text-sm">{user.email}</span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {getStatusText()}
                    </span>
                  </div>
                  <div className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                    v{pkg.version}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/projects">
                  <FolderKanban />
                  Projects
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`${getWebsiteUrl()}/docs`} target="_blank" rel="noopener noreferrer">
                  <BookOpen />
                  Documentation
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewsletterOpen(true)}>
                <Mail />
                Subscribe to Newsletter
              </DropdownMenuItem>
              {isPwa && (
                <DropdownMenuItem onClick={() => window.location.reload()}>
                  <RefreshCw />
                  Reload App
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <NewsletterDialog
        open={isNewsletterOpen}
        onOpenChange={setIsNewsletterOpen}
        defaultEmail={user.email}
      />
    </>
  );
}
