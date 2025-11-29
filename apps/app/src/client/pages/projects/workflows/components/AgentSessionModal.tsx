/**
 * AgentSessionModal Component
 *
 * Modal wrapper that displays AgentSessionViewer for workflow steps.
 * Opens when user clicks "View Agent Session" on a workflow step.
 *
 * Features:
 * - Full screen viewport for optimal viewing
 * - Header with session name and close button
 * - Embeds AgentSessionViewer in read-only mode
 * - Clears session data on close (prevents stale data)
 * - Null-safe rendering
 */

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/client/components/ui/dialog";
import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { XIcon } from "lucide-react";

export interface AgentSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sessionId: string | null;
  sessionName?: string; // Optional: For modal title
}

/**
 * Modal that displays an agent session conversation.
 * Used in workflow run steps to view session details without navigation.
 */
export function AgentSessionModal({
  open,
  onOpenChange,
  projectId,
  sessionId,
  sessionName,
}: AgentSessionModalProps) {
  // Clear session data when modal closes
  useEffect(() => {
    if (!open && sessionId) {
      // Delay cleanup slightly to allow for animations
      const timer = setTimeout(() => {
        useSessionStore.getState().clearSession(sessionId);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, sessionId]);

  // Don't render if no session selected
  if (!sessionId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!top-0 !left-0 !translate-x-0 !translate-y-0 max-w-[100vw] max-h-[100vh] w-screen h-screen flex flex-col overflow-hidden p-0 safe-area-pt safe-area-pb"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center px-6 py-3 border-b">
          <DialogTitle className="flex-1">{sessionName || "Agent Session"}</DialogTitle>
          <DialogClose className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <AgentSessionViewer
            projectId={projectId}
            sessionId={sessionId}
            height="100%"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
