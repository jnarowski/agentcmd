import { useNavigationStore } from "@/client/stores/index";
import { useSession } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import type { SessionResponse } from "@/shared/types";

/**
 * Return type for useActiveSession hook
 */
export interface UseActiveSessionReturn {
  /** The active session object, or null if no session is active */
  session: SessionResponse | null;
  /** The active session ID, or null if no session is active */
  sessionId: string | null;
  /** Whether the sessions query is loading */
  isLoading: boolean;
  /** Query error, if any */
  error: Error | null;
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

  const sessionQuery = useSession(activeSessionId || undefined, activeProjectId || undefined);

  return {
    session: sessionQuery.data ?? null,
    sessionId: activeSessionId,
    isLoading: sessionQuery.isLoading,
    error: sessionQuery.error,
  };
}
