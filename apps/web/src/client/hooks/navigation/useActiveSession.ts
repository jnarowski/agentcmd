import { useNavigationStore } from "@/client/stores/index";
import { useProjectsWithSessions } from "@/client/pages/projects/hooks/useProjects";
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
 * Combines the navigationStore's activeProjectId and activeSessionId with
 * React Query's sessions data to provide convenient access to the current session.
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

  const projectsQuery = useProjectsWithSessions();

  // Find the active project and get its sessions
  const activeProject = projectsQuery.data?.find(
    (p) => p.id === activeProjectId
  );
  const sessions = activeProject?.sessions || [];

  const session = sessions.find((s) => s.id === activeSessionId) ?? null;

  return {
    session,
    sessionId: activeSessionId,
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
  };
}
