/**
 * AgentSessionViewer Component
 *
 * Reusable session viewer that loads messages and subscribes to WebSocket updates.
 * Can be used in both full-page views and modal dialogs.
 *
 * Features:
 * - Loads session messages via sessionStore.loadSession()
 * - Subscribes to WebSocket for real-time updates
 * - Uses existing ChatInterface component internally
 * - Handles loading/error/empty states
 * - Auto-scroll behavior via Conversation wrapper
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "@/client/pages/projects/sessions/components/ChatInterface";
import { useSessionWebSocket } from "@/client/pages/projects/sessions/hooks/useSessionWebSocket";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
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

  /** Optional: Auto-load session on mount (default: true) */
  autoLoad?: boolean;

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
 */
export function AgentSessionViewer({
  projectId,
  sessionId,
  height = "100%",
  className,
  autoLoad = true,
  onSessionLoad,
  onError,
  clearOnUnmount = false,
  onApprove,
}: AgentSessionViewerProps) {
  const queryClient = useQueryClient();
  const sessionIdRef = useRef(sessionId);

  // Subscribe to current session from store
  const session = useSessionStore((s) => s.session);
  const loadSession = useSessionStore((s) => s.loadSession);
  const clearSession = useSessionStore((s) => s.clearSession);

  // Load session on mount or when sessionId changes
  useEffect(() => {
    if (!autoLoad) return;

    const loadSessionData = async () => {
      try {
        // Clear previous session if loading a different one
        if (session && session.id !== sessionId) {
          clearSession();
        }

        // Load new session
        // @ts-expect-error - QueryClient type incompatibility between versions
        await loadSession(sessionId, projectId, queryClient);

        // Get loaded session and trigger callback
        const loadedSession = useSessionStore.getState().session;
        if (onSessionLoad && loadedSession) {
          onSessionLoad(loadedSession);
        }
      } catch (error) {
        console.error("[AgentSessionViewer] Error loading session:", error);
        if (onError) {
          onError(error as Error);
        }
      }
    };

    // Only load if sessionId changed
    if (sessionIdRef.current !== sessionId) {
      loadSessionData();
      sessionIdRef.current = sessionId;
    } else if (!session || session.id !== sessionId) {
      // Load if session not in store yet
      loadSessionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId, autoLoad]);

  // WebSocket subscription for real-time updates
  useSessionWebSocket({ sessionId, projectId });

  // Cleanup on unmount if requested (useful for modals)
  useEffect(() => {
    return () => {
      if (clearOnUnmount) {
        clearSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearOnUnmount]);

  // Render ChatInterface with session data
  return (
    <div className={className} style={{ height }}>
      <ChatInterface
        projectId={projectId}
        sessionId={session?.id}
        agent={session?.agent}
        messages={session?.messages || []}
        isLoading={session?.loadingState === "loading"}
        error={session?.error ? new Error(session.error) : null}
        isStreaming={session?.isStreaming || false}
        isLoadingHistory={session?.loadingState === "loading"}
        onApprove={onApprove}
      />
    </div>
  );
}
