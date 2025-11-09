/**
 * AgentSessionViewer Component
 *
 * Reusable session viewer that loads messages and subscribes to WebSocket updates.
 * Can be used in both full-page views and modal dialogs.
 *
 * Features:
 * - Loads session data via React Query hooks (useSession + useSessionMessages)
 * - Syncs React Query data to Zustand store for UI state
 * - Subscribes to WebSocket for real-time updates
 * - Uses existing ChatInterface component internally
 * - Handles loading/error/empty states
 * - Auto-scroll behavior via Conversation wrapper
 */

import { useEffect } from "react";
import { ChatInterface } from "@/client/pages/projects/sessions/components/ChatInterface";
import { useSessionWebSocket } from "@/client/pages/projects/sessions/hooks/useSessionWebSocket";
import { useSession, useSessionMessages } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { useSessionStore, enrichMessagesWithToolResults } from "@/client/pages/projects/sessions/stores/sessionStore";
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
 *
 * Data flow: React Query (source of truth) → Zustand (UI state only)
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
  // Fetch session data via React Query (parallel fetching)
  const { data: sessionData, isLoading: isLoadingSession, error: sessionError } = useSession(
    autoLoad ? sessionId : undefined,
    autoLoad ? projectId : undefined
  );
  const { data: messagesData, isLoading: isLoadingMessages, error: messagesError } = useSessionMessages(
    autoLoad ? sessionId : undefined,
    autoLoad ? projectId : undefined
  );

  // Subscribe to current session from store
  const session = useSessionStore((s) => s.session);
  const clearSession = useSessionStore((s) => s.clearSession);

  // Sync React Query data → Zustand store (one-way flow)
  useEffect(() => {
    if (!autoLoad || !sessionData) return;

    const enrichedMessages = messagesData ? enrichMessagesWithToolResults(messagesData) : [];

    useSessionStore.setState({
      sessionId: sessionData.id,
      session: {
        id: sessionData.id,
        name: sessionData.name,
        agent: sessionData.agent,
        messages: enrichedMessages,
        isStreaming: false,
        metadata: sessionData.metadata,
        loadingState: isLoadingMessages ? "loading" : "loaded",
        error: null,
      },
    });

    // Trigger onSessionLoad callback
    if (onSessionLoad && !isLoadingMessages) {
      onSessionLoad({
        id: sessionData.id,
        name: sessionData.name,
        agent: sessionData.agent,
        messages: enrichedMessages,
        isStreaming: false,
        metadata: sessionData.metadata,
        loadingState: "loaded",
        error: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData, messagesData, isLoadingMessages, autoLoad]);

  // Handle errors from React Query
  useEffect(() => {
    const error = sessionError || messagesError;
    if (error && onError) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [sessionError, messagesError, onError]);

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

  // Compute combined loading/error states
  const isLoading = isLoadingSession || isLoadingMessages;
  const error = sessionError || messagesError;

  // Render ChatInterface with session data
  return (
    <div className={className} style={{ height }}>
      <ChatInterface
        projectId={projectId}
        sessionId={session?.id}
        agent={session?.agent}
        messages={session?.messages || []}
        isLoading={isLoading}
        error={error ? (error instanceof Error ? error : new Error(String(error))) : null}
        isStreaming={session?.isStreaming || false}
        isLoadingHistory={isLoading}
        onApprove={onApprove}
      />
    </div>
  );
}
