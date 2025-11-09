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
import type { SessionResponse } from "@/shared/types";
import type { AgentType } from "@/shared/types/agent.types";

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

  const handleActivityClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(`/projects/${projectId}/sessions/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
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
        className="h-auto min-h-[28px] px-2 py-1"
      >
        {agent && <AgentIcon agent={agent} className="size-4 shrink-0 mr-1" />}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <span className="text-sm min-w-0 truncate">{name}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              variant="secondary"
              className={`h-4 px-1.5 text-[10px] w-12 shrink-0 justify-center ${getStatusColor(status)}`}
            >
              {status}
            </Badge>
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[10px] bg-muted/50 text-muted-foreground hover:bg-muted/50 truncate"
            >
              {projectName}
            </Badge>
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
