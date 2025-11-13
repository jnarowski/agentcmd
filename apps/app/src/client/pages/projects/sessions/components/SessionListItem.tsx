import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { SessionResponse } from "@/shared/types";
import { cn } from "@/client/utils/cn";
import { AgentIcon } from "@/client/components/AgentIcon";
import { Badge } from "@/client/components/ui/badge";
import { useSidebar } from "@/client/components/ui/sidebar";
import { useState } from "react";
import { SessionDropdownMenu } from "./SessionDropdownMenu";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { truncate } from "@/client/utils/truncate";
import { Loader2 } from "lucide-react";

interface SessionListItemProps {
  session: SessionResponse;
  projectId: string;
  isActive?: boolean;
}


export function SessionListItem({
  session,
  projectId,
  isActive = false,
}: SessionListItemProps) {
  const { id, metadata, created_at, type, permission_mode, state } = session;
  const messageCount = metadata?.messageCount ?? 0;
  const { isMobile, setOpenMobile } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });

  // Use utility function for consistent session naming
  const displayName = getSessionDisplayName(session);

  // Truncate long names from the left with ellipsis
  const truncatedName = truncate(displayName, 30);

  const handleClick = () => {
    // Close mobile menu when clicking a session
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      <Link
        to={`/projects/${projectId}/sessions/${id}`}
        onClick={handleClick}
        className={cn(
          "block px-2.5 py-2 rounded-lg overflow-hidden relative border transition-all hover:bg-accent/50",
          isActive
            ? "border-primary/20 bg-accent/30"
            : "border-transparent"
        )}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <AgentIcon
            agent={session.agent}
            className={cn(
              "h-5 w-5 mt-0.5 shrink-0",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm leading-tight min-w-0">
              <span className="truncate" title={displayName}>
                {truncatedName}
              </span>
              {permission_mode === 'plan' && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/20 shrink-0">
                  Planning
                </Badge>
              )}
              {type === 'workflow' && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-blue-500/10 text-blue-500 border-blue-500/20 shrink-0">
                  Workflow
                </Badge>
              )}
              {state === 'working' && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  <span>Working</span>
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
              <span className="truncate">{timeAgo}</span>
              <span className="shrink-0 tabular-nums">{messageCount} messages</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Hover menu - hidden on mobile */}
      {!isMobile && (isHovered || isMenuOpen) && (
        <div className="absolute right-2 top-2 z-50">
          <SessionDropdownMenu
            session={session}
            onMenuOpenChange={setIsMenuOpen}
          />
        </div>
      )}
    </div>
  );
}
