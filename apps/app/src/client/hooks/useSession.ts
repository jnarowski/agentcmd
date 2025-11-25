import { useEffect } from 'react';
import { useSessionStore, selectActiveSession } from '@/client/pages/projects/sessions/stores/sessionStore';
import type { UIMessage } from '@/shared/types/message.types';
import type { AgentSessionMetadata } from '@/shared/types/agent-session.types';
import type { LoadingState } from '@/client/pages/projects/sessions/stores/sessionStore';

// Stable empty array to avoid creating new references
const EMPTY_ARRAY: UIMessage[] = [];

/**
 * Zustand-based session hook
 * Auto-loads session from API if not in store
 * Returns session data with reactive updates
 *
 * @param sessionId - Session ID to load
 * @param projectId - Project ID (required for API fetch)
 * @returns Session data with messages, metadata, loading, error states
 *
 * @example
 * const { messages, metadata, isLoading, isStreaming, error } = useSession(sessionId, projectId);
 */
export interface UseSessionReturn {
  messages: UIMessage[];
  metadata: AgentSessionMetadata | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  loadingState: LoadingState;
}

export function useSession(sessionId: string, projectId: string): UseSessionReturn {
  const loadSession = useSessionStore((s) => s.loadSession);
  const currentSession = useSessionStore(selectActiveSession);

  // Get session data only if it matches the requested sessionId
  const session = currentSession?.id === sessionId ? currentSession : null;

  // Auto-load session if not in store (don't auto-retry on error to avoid infinite loops)
  useEffect(() => {
    const willLoad = !session || session.loadingState === 'idle';

    if (willLoad) {
      loadSession(sessionId, projectId);
    }
  }, [sessionId, projectId, session?.loadingState, loadSession, currentSession?.id, session]);

  // Return stable references
  return {
    messages: session?.messages || EMPTY_ARRAY,
    metadata: session?.metadata || null,
    isLoading: session?.loadingState === 'loading',
    isStreaming: session?.isStreaming || false,
    error: session?.error || null,
    loadingState: session?.loadingState || 'idle',
  };
}
