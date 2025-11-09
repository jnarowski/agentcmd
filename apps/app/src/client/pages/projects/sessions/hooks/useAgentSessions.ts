import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionResponse } from "@/shared/types";
import type { UnifiedMessage } from "agent-cli-sdk";
import { api } from "@/client/utils/api";
import { toast } from "sonner";
import { projectKeys } from "@/client/pages/projects/hooks/queryKeys";
import { sessionKeys } from "./queryKeys";

export interface GetSessionsFilters {
  projectId?: string;
  limit?: number;
  includeArchived?: boolean;
  orderBy?: 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

/**
 * Generic sessions query with optional filters
 * Used for sidebar activities, command menu, etc.
 */
export function useSessions(filters?: GetSessionsFilters) {
  return useQuery({
    queryKey: filters?.projectId
      ? sessionKeys.byProject(filters.projectId)
      : sessionKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.includeArchived) params.append('includeArchived', 'true');
      if (filters?.orderBy) params.append('orderBy', filters.orderBy);
      if (filters?.order) params.append('order', filters.order);

      const result = await api.get<{ data: SessionResponse[] }>(
        `/api/sessions?${params.toString()}`
      );
      return result.data;
    },
  });
}

/**
 * Single session metadata query
 * Automatically fetches in parallel with useSessionMessages
 */
export function useSession(sessionId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: sessionId && projectId ? sessionKeys.detail(sessionId, projectId) : ['session-disabled'],
    queryFn: async () => {
      if (!sessionId || !projectId) throw new Error('Session ID and Project ID are required');

      const result = await api.get<{ data: SessionResponse }>(
        `/api/projects/${projectId}/sessions/${sessionId}`
      );
      return result.data;
    },
    enabled: !!sessionId && !!projectId,
  });
}

/**
 * Session messages query
 * Special handling: 404 means new session (no messages yet)
 */
export function useSessionMessages(sessionId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: sessionId && projectId ? sessionKeys.messages(sessionId, projectId) : ['messages-disabled'],
    queryFn: async () => {
      if (!sessionId || !projectId) throw new Error('Session ID and Project ID are required');

      const result = await api.get<{ data: UnifiedMessage[] }>(
        `/api/projects/${projectId}/sessions/${sessionId}/messages`
      );
      return result.data;
    },
    enabled: !!sessionId && !!projectId,
    retry: (failureCount, error) => {
      // Don't retry on 404 - new sessions have no messages yet
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await api.patch<{ data: SessionResponse }>(
        `/api/sessions/${id}`,
        { name }
      );
      return result.data;
    },
    onSuccess: (updatedSession) => {
      // Update cache for the project's sessions
      queryClient.setQueryData<SessionResponse[]>(
        sessionKeys.byProject(updatedSession.projectId),
        (old) => {
          if (!old) return [updatedSession];
          return old.map((session) =>
            session.id === updatedSession.id ? updatedSession : session
          );
        }
      );

      // Invalidate projects with sessions query (used by sidebar)
      queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() });

      toast.success("Session name updated successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to update session name";
      toast.error(message);
    },
  });
}

export function useArchiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api.post<{ data: SessionResponse }>(
        `/api/sessions/${id}/archive`
      );
      return result.data;
    },
    onSuccess: (archivedSession) => {
      // Update cache for the project's sessions
      queryClient.setQueryData<SessionResponse[]>(
        sessionKeys.byProject(archivedSession.projectId),
        (old) => {
          if (!old) return [archivedSession];
          return old.map((session) =>
            session.id === archivedSession.id ? archivedSession : session
          );
        }
      );

      // Invalidate projects with sessions query (used by sidebar)
      queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() });

      toast.success("Session archived successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to archive session";
      toast.error(message);
    },
  });
}

export function useUnarchiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api.post<{ data: SessionResponse }>(
        `/api/sessions/${id}/unarchive`
      );
      return result.data;
    },
    onSuccess: (unarchivedSession) => {
      // Update cache for the project's sessions
      queryClient.setQueryData<SessionResponse[]>(
        sessionKeys.byProject(unarchivedSession.projectId),
        (old) => {
          if (!old) return [unarchivedSession];
          return old.map((session) =>
            session.id === unarchivedSession.id ? unarchivedSession : session
          );
        }
      );

      // Invalidate projects with sessions query (used by sidebar)
      queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() });

      toast.success("Session unarchived successfully");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to unarchive session";
      toast.error(message);
    },
  });
}
