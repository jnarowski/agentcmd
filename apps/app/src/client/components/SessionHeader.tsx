import { Copy } from "lucide-react";
import { toast } from "sonner";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionDropdownMenu } from "@/client/pages/projects/sessions/components/SessionDropdownMenu";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import type { SessionResponse } from "@/shared/types";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { copySessionToClipboard } from "@/client/pages/projects/sessions/utils/copySessionToClipboard";
import { Button } from "@/client/components/ui/button";

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

  const handleCopySession = async () => {
    try {
      // Get state when needed to avoid infinite loop from object recreation
      const state = useSessionStore.getState();
      const sessionState = { session: state.session, sessionId: state.sessionId };

      await copySessionToClipboard(sessionState);
      toast.success("Session JSON copied to clipboard", {
        description: "Full session data including messages and metadata",
      });
    } catch (error) {
      console.error('[SessionHeader] Failed to copy session:', error);
      toast.error("Failed to copy session", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

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
        {import.meta.env.DEV && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopySession}
            title="Copy session JSON to clipboard"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        <SessionDropdownMenu session={session} />
      </div>
    </div>
  );
}
