import { useState } from "react";
import { Link } from "react-router-dom";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/client/components/ui/sidebar";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionDropdownMenu } from "@/client/pages/projects/sessions/components/SessionDropdownMenu";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { useNavigationStore } from "@/client/stores";
import type { SessionSummary } from "@/client/pages/projects/sessions/stores/sessionStore";
import type { AgentType } from "@/shared/types/agent.types";
import { formatDate } from "@/shared/utils/formatDate";
import { PERMISSION_MODE_CONFIG } from "@/client/constants/permissionModes";

interface SessionItemProps {
  id: string;
  projectId: string;
  projectName: string;
  status: string;
  agent?: AgentType;
  session: SessionSummary;
  isActive?: boolean;
}

export function SessionItem({
  id,
  projectId,
  projectName,
  agent,
  session,
  isActive = false,
}: SessionItemProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(
    null
  );
  const [menuOpenActivityId, setMenuOpenActivityId] = useState<string | null>(
    null
  );
  const displayName = getSessionDisplayName(session);
  const timeAgo = formatDate(session.created_at);

  return (
    <SidebarMenuItem
      key={id}
      onMouseEnter={() => !isMobile && setHoveredActivityId(id)}
      onMouseLeave={() => !isMobile && setHoveredActivityId(null)}
      className="relative"
    >
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="h-auto min-h-[28px] px-2 py-2"
      >
        <Link
          to={`/projects/${projectId}/sessions/${id}`}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          {agent && <AgentIcon agent={agent} className="size-4 shrink-0 mr-1" />}
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm">{displayName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="text-xs text-muted-foreground tabular-nums">
                {timeAgo}
              </div>
              {!activeProjectId && (
                <>
                  <div className="text-xs text-muted-foreground">•</div>
                  <div className="text-xs text-muted-foreground">{projectName}</div>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs ${
                  PERMISSION_MODE_CONFIG[session.permission_mode].textColor
                }`}
              >
                {PERMISSION_MODE_CONFIG[session.permission_mode].label}
              </span>
              <SessionStateBadge
                state={session.state}
                errorMessage={session.error_message}
                compact
              />
            </div>
          </div>
        </Link>
      </SidebarMenuButton>
      {!isMobile && (hoveredActivityId === id || menuOpenActivityId === id) && (
        <div className="absolute right-2 top-2 z-50">
          <SessionDropdownMenu
            session={session}
            onMenuOpenChange={(open) => setMenuOpenActivityId(open ? id : null)}
            triggerClassName="data-[state=open]:bg-accent"
          />
        </div>
      )}
    </SidebarMenuItem>
  );
}
