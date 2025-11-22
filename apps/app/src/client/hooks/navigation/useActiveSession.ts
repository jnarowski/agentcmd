import { useNavigationStore } from "@/client/stores/index";
import { useSession } from "@/client/hooks/useSession";
import type { AgentSessionMetadata } from "@/shared/types/agent-session.types";

/**
 * Return type for useActiveSession hook
 */
export interface UseActiveSessionReturn {
  /** The active session metadata, or null if no session is active */
  session: AgentSessionMetadata | null;
  /** The active session ID, or null if no session is active */
  sessionId: string | null;
  /** Whether the sessions query is loading */
  isLoading: boolean;
  /** Query error, if any */
  error: string | null;
}

/**
 * Hook to get the currently active session
 *
 * Uses useSession hook directly with activeProjectId and activeSessionId from navigation store.
 * This eliminates over-fetching by only loading the specific session needed.
 *
 * @example
 * ```typescript
 * const { session, sessionId, isLoading } = useActiveSession();
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (!session) return <div>No session selected</div>;
 *
 * return <div>Active session: {session.name}</div>;
 * ```
 */
export function useActiveSession(): UseActiveSessionReturn {
  const activeProjectId = useNavigationStore((state) => state.activeProjectId);
  const activeSessionId = useNavigationStore((state) => state.activeSessionId);

  // Only call useSession if both IDs exist
  const sessionData = useSession(
    activeSessionId || '',
    activeProjectId || ''
  );

  return {
    session: sessionData.metadata ?? null,
    sessionId: activeSessionId,
    isLoading: sessionData.isLoading,
    error: sessionData.error ?? null,
  };
}
