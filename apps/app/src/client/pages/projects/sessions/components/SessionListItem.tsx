import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { SessionResponse } from "@/shared/types";
import { cn } from "@/client/utils/cn";
import { AgentIcon } from "@/client/components/AgentIcon";
import { useSidebar } from "@/client/components/ui/sidebar";
import { useState } from "react";
import { SessionDropdownMenu } from "./SessionDropdownMenu";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { truncate } from "@/client/utils/truncate";

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
  const { id, metadata, created_at } = session;
  const { messageCount } = metadata;
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
            <div className="text-sm leading-tight truncate" title={displayName}>
              {truncatedName}
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
