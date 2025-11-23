import { Copy, Pencil, Workflow } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionDropdownMenu } from "@/client/pages/projects/sessions/components/SessionDropdownMenu";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import type { SessionResponse } from "@/shared/types";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { useSessionStore, selectSession } from "@/client/pages/projects/sessions/stores/sessionStore";
import { copySessionToClipboard } from "@/client/pages/projects/sessions/utils/copySessionToClipboard";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
interface SessionHeaderProps {
  session: SessionResponse;
}

/**
 * Session header bar that displays current session info with dropdown menu
 * Shows agent icon, session name, and actions menu on the far right
 */
export function SessionHeader({ session }: SessionHeaderProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateSession = useSessionStore((s) => s.updateSession);
  const sessionData = useSessionStore(selectSession(session.id));

  // Get display name with consistent fallback logic, then truncate to 50 characters
  const displayName = getSessionDisplayName(session);
  const truncatedSessionName =
    displayName.length > 50 ? displayName.slice(0, 50) + "..." : displayName;

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(displayName);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== displayName) {
      try {
        await updateSession(session.id, { name: trimmedValue });
        setIsEditing(false);
        toast.success("Session name updated");
      } catch (error) {
        console.error("[SessionHeader] Failed to update session name:", error);
        toast.error("Failed to update session name");
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleCopySession = async () => {
    try {
      // Use the sessionData from store (includes messages, metadata, etc.)
      const sessionState = {
        session: sessionData || null,
        sessionId: session.id,
      };

      await copySessionToClipboard(sessionState);
      toast.success("Session JSON copied to clipboard", {
        description: "Full session data including messages and metadata",
      });
    } catch (error) {
      console.error("[SessionHeader] Failed to copy session:", error);
      toast.error("Failed to copy session", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleNewWorkflow = () => {
    navigate(
      `/projects/${session.projectId}/workflows/new?planningSessionId=${session.id}&specInputType=planning`
    );
  };

  return (
    <div className="sticky top-[52px] z-10 flex items-center justify-between gap-1.5 px-4 md:px-6 py-1.5 text-sm text-muted-foreground bg-muted/30 border-b">
      <div className="flex items-center gap-2 min-w-0">
        <AgentIcon agent={session.agent} className="h-3.5 w-3.5 shrink-0" />
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-auto px-1 py-0 border-0 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-offset-0 min-w-[300px] max-w-md"
          />
        ) : (
          <div
            className="flex items-center gap-1.5 min-w-0 cursor-pointer group"
            onClick={handleStartEdit}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span className="truncate">{truncatedSessionName}</span>
            <Pencil
              className={`h-3 w-3 shrink-0 transition-opacity ${
                isHovered ? "opacity-70" : "opacity-0"
              }`}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <SessionStateBadge
          state={session.state}
          errorMessage={session.error_message}
        />
        {session.permission_mode === "plan" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNewWorkflow}
              >
                <Workflow className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Create workflow from this planning session
            </TooltipContent>
          </Tooltip>
        )}
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
