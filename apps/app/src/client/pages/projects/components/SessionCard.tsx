import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/client/components/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionDropdownMenu } from "@/client/pages/projects/sessions/components/SessionDropdownMenu";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import type { SessionResponse } from "@/shared/types";
import type { AgentType } from "@/shared/types/agent.types";
import { format } from "date-fns";

interface SessionCardProps {
  id: string;
  projectId: string;
  projectName: string;
  status: string;
  agent?: AgentType;
  session: SessionResponse;
  showProjectName?: boolean;
}

/**
 * Card-based session display for project home page
 * Adapted from sidebar SessionItem for larger layout
 */
export function SessionCard({
  id,
  projectId,
  projectName,
  agent,
  session,
  showProjectName = false,
}: SessionCardProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = getSessionDisplayName(session);
  const timeAgo = format(new Date(session.created_at), "MM/dd 'at' h:mma");

  const handleClick = () => {
    navigate(`/projects/${projectId}/sessions/${id}`);
  };

  return (
    <Card
      className="relative cursor-pointer hover:bg-accent/50 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {agent && <AgentIcon agent={agent} className="size-5 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">{displayName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="tabular-nums">{timeAgo}</span>
              {showProjectName && (
                <>
                  <span>•</span>
                  <span className="truncate">{projectName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {session.permission_mode === "plan" && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 border-green-500/20 shrink-0"
                >
                  Plan
                </Badge>
              )}
              <SessionStateBadge
                state={session.state}
                errorMessage={session.error_message}
                compact
              />
            </div>
          </div>
        </div>
      </div>
      {(hovered || menuOpen) && (
        <div className="absolute right-3 top-3 z-10">
          <SessionDropdownMenu
            session={session}
            onMenuOpenChange={setMenuOpen}
            triggerClassName="data-[state=open]:bg-accent"
          />
        </div>
      )}
    </Card>
  );
}
