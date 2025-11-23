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
} from "@/client/components/ui/dialog";
import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";

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
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{sessionName || "Agent Session"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto pb-6">
          <AgentSessionViewer
            projectId={projectId}
            sessionId={sessionId}
            height="100%"
            clearOnUnmount={false} // Manual cleanup via useEffect above
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
