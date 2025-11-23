import { useEffect } from 'react';
import { useSessionStore, selectSessionList } from '@/client/pages/projects/sessions/stores/sessionStore';
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
  const listData = useSessionStore((state) => selectSessionList(projectId)(state));

  // Auto-load list if not in Map
  useEffect(() => {
    if (!listData) {
      loadSessionList(projectId, filters);
    }
  }, [projectId, listData, loadSessionList, filters]);

  // Return stable references
  return {
    sessions: listData?.sessions || [],
    isLoading: listData?.loading || false,
    error: listData?.error || null,
  };
}
