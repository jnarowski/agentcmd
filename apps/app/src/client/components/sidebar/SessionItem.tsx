import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/client/components/ui/sidebar";
import { Badge } from "@/client/components/ui/badge";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionDropdownMenu } from "@/client/pages/projects/sessions/components/SessionDropdownMenu";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import type { SessionResponse } from "@/shared/types";
import type { AgentType } from "@/shared/types/agent.types";
import { formatDistanceToNow } from "date-fns";

interface SessionItemProps {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: string;
  agent?: AgentType;
  session: SessionResponse;
  isActive?: boolean;
}

export function SessionItem({
  id,
  name,
  projectId,
  projectName,
  status,
  agent,
  session,
  isActive = false,
}: SessionItemProps) {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(
    null
  );
  const [menuOpenActivityId, setMenuOpenActivityId] = useState<string | null>(
    null
  );
  const timeAgo = formatDistanceToNow(new Date(session.created_at), {
    addSuffix: true,
  });
  const handleActivityClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(`/projects/${projectId}/sessions/${id}`);
  };

  return (
    <SidebarMenuItem
      key={id}
      onMouseEnter={() => setHoveredActivityId(id)}
      onMouseLeave={() => setHoveredActivityId(null)}
      className="relative"
    >
      <SidebarMenuButton
        onClick={handleActivityClick}
        isActive={isActive}
        className="h-auto min-h-[28px] px-2 py-2"
      >
        {agent && <AgentIcon agent={agent} className="size-4 shrink-0 mr-1" />}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <span className="truncate text-sm">{name}</span>
          {(session.state === "working" || session.permission_mode === "plan") && (
            <div className="flex items-center gap-1.5">
              {session.state === "working" && (
                <SessionStateBadge state={session.state} />
              )}
              {session.state === "working" && session.permission_mode === "plan" && (
                <div className="text-xs text-muted-foreground">•</div>
              )}
              {session.permission_mode === "plan" && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                  Plan
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="text-xs text-muted-foreground">{timeAgo}</div>
            <div className="text-xs text-muted-foreground">•</div>
            <div className="text-xs text-muted-foreground">{projectName}</div>
          </div>
        </div>
      </SidebarMenuButton>
      {(hoveredActivityId === id || menuOpenActivityId === id) && (
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
