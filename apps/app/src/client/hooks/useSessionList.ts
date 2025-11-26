import { useEffect, useMemo } from 'react';
import { useSessionStore } from '@/client/pages/projects/sessions/stores/sessionStore';
import type { SessionSummary } from '@/client/pages/projects/sessions/stores/sessionStore';

/**
 * Zustand-based session list hook
 * Auto-loads list from API if not in Map
 * Returns session list with reactive updates
 *
 * @param projectId - Project ID to load sessions for (null = all sessions)
 * @param filters - Optional filters (type, limit, orderBy, etc.)
 * @returns Session list with loading and error states
 *
 * @example
 * const { sessions, isLoading, error } = useSessionList(projectId, { limit: 20, type: 'chat' });
 * const { sessions } = useSessionList(null, { limit: 20 }); // All sessions
 */
export interface UseSessionListReturn {
  sessions: SessionSummary[];
  isLoading: boolean;
  error: string | null;
}

export function useSessionList(
  projectId: string | null,
  filters?: Record<string, unknown>
): UseSessionListReturn {
  const loadSessionList = useSessionStore((s) => s.loadSessionList);

  // Use separate selectors for primitives/stable references - avoids creating new objects
  const allSessions = useSessionStore((state) => state.sessionList.sessions);
  const loading = useSessionStore((state) => state.sessionList.loading);
  const error = useSessionStore((state) => state.sessionList.error);
  const lastFetched = useSessionStore((state) => state.sessionList.lastFetched);

  // Filter in component with useMemo, not in Zustand selector
  const sessions = useMemo(
    () => projectId ? allSessions.filter(s => s.projectId === projectId) : allSessions,
    [allSessions, projectId]
  );

  // Stringify filters for stable dependency (primitives only)
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  // Auto-load list if not loaded yet (check lastFetched, not sessions.length to avoid infinite loop)
  useEffect(() => {
    if (!loading && lastFetched === 0 && !error) {
      loadSessionList(projectId, filters);
    }
  }, [projectId, filtersKey, loadSessionList, filters, loading, lastFetched, error]);

  // Return stable references
  return {
    sessions,
    isLoading: loading,
    error,
  };
}
