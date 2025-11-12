/**
 * TanStack Query hook for fetching tasks (specs + planning sessions)
 */

import { useQuery } from "@tanstack/react-query";
import type { TasksResponse } from "@/shared/types/task.types";
import { api } from "@/client/utils/api";

/**
 * Fetch tasks from the API (optionally filtered by project)
 */
async function fetchTasks(projectId?: string | null): Promise<TasksResponse> {
  const params = new URLSearchParams();
  if (projectId) {
    params.append('project_id', projectId);
  }
  const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`;
  const data = await api.get<{ data: TasksResponse }>(url);
  return data.data;
}

/**
 * Hook to fetch tasks (specs and planning sessions, optionally filtered by project)
 * Results are cached for 30s on the server
 */
export function useTasks(projectId?: string | null) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => fetchTasks(projectId),
    staleTime: 30000, // Match server cache TTL
  });
}
