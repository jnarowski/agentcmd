import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionDropdownMenu } from "@/client/pages/projects/sessions/components/SessionDropdownMenu";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import type { SessionResponse } from "@/shared/types";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";

interface SessionHeaderProps {
  session: SessionResponse;
}

/**
 * Session header bar that displays current session info with dropdown menu
 * Shows agent icon, session name, and actions menu on the far right
 */
export function SessionHeader({ session }: SessionHeaderProps) {
  // Get display name with consistent fallback logic, then truncate to 50 characters
  const displayName = getSessionDisplayName(session);
  const truncatedSessionName =
    displayName.length > 50 ? displayName.slice(0, 50) + "..." : displayName;

  return (
    <div className="flex items-center justify-between gap-1.5 px-4 md:px-6 py-1.5 text-sm text-muted-foreground bg-muted/30 border-b">
      <div className="flex items-center gap-2 min-w-0">
        <AgentIcon agent={session.agent} className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{truncatedSessionName}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <SessionStateBadge
          state={session.state}
          errorMessage={session.error_message}
        />
        <SessionDropdownMenu session={session} />
      </div>
    </div>
  );
}
