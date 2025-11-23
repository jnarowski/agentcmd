/**
 * AgentSessionViewer Component
 *
 * Reusable session viewer that loads messages and subscribes to WebSocket updates.
 * Can be used in both full-page views and modal dialogs.
 *
 * Features:
 * - Loads session data via Zustand store (useSession hook)
 * - Subscribes to WebSocket for real-time updates
 * - Uses existing ChatInterface component internally
 * - Handles loading/error/empty states
 * - Auto-scroll behavior via Conversation wrapper
 */

import { useEffect } from "react";
import { ChatInterface } from "@/client/pages/projects/sessions/components/ChatInterface";
import { useSessionWebSocket } from "@/client/pages/projects/sessions/hooks/useSessionWebSocket";
import { useSession } from "@/client/hooks/useSession";
import {
  useSessionStore,
  selectActiveSession,
} from "@/client/pages/projects/sessions/stores/sessionStore";
import type { SessionData } from "@/client/pages/projects/sessions/stores/sessionStore";

export interface AgentSessionViewerProps {
  /** Project ID containing the session */
  projectId: string;

  /** Session ID to display */
  sessionId: string;

  /** Optional: Custom height (default: 100%) */
  height?: string;

  /** Optional: Custom className for container */
  className?: string;

  /** Optional: Callback when session loads */
  onSessionLoad?: (session: SessionData) => void;

  /** Optional: Callback on error */
  onError?: (error: Error) => void;

  /** Optional: Clear session data on unmount (default: false) */
  clearOnUnmount?: boolean;

  /** Optional: Callback for permission approval */
  onApprove?: (toolUseId: string) => void;
}

/**
 * Self-contained session viewer that manages its own session loading and WebSocket subscription.
 * Renders the ChatInterface component with session data from the store.
 *
 * Data flow: Zustand store (single source of truth) ← WebSocket updates
 */
export function AgentSessionViewer({
  projectId,
  sessionId,
  height = "100%",
  className,
  onSessionLoad,
  onError,
  clearOnUnmount = false,
  onApprove,
}: AgentSessionViewerProps) {
  // Load session data via Zustand hook (auto-loads if not in store)
  const { messages, isLoading, isStreaming, error } = useSession(
    sessionId,
    projectId
  );

  // Get full session data from store
  const session = useSessionStore(selectActiveSession);
  const clearSession = useSessionStore((s) => s.clearSession);

  // Trigger onSessionLoad callback when data is loaded
  useEffect(() => {
    if (session && session.id === sessionId && !isLoading && onSessionLoad) {
      onSessionLoad(session);
    }
  }, [session, sessionId, isLoading, onSessionLoad]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // WebSocket subscription for real-time updates
  useSessionWebSocket({ sessionId, projectId });

  // Render ChatInterface with session data
  return (
    <div className={className} style={{ height }}>
      <ChatInterface
        projectId={projectId}
        sessionId={sessionId}
        agent={session?.agent}
        messages={messages}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        isStreaming={isStreaming}
        isLoadingHistory={isLoading}
        onApprove={onApprove}
      />
    </div>
  );
}
