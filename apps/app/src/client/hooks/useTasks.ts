/**
 * TanStack Query hook for fetching tasks (specs + planning sessions)
 */

import { useQuery } from "@tanstack/react-query";
import type { TasksResponse } from "@/shared/types/task.types";
import { api } from "@/client/utils/api";

/**
 * Fetch tasks from the API (scans all projects)
 */
async function fetchTasks(): Promise<TasksResponse> {
  const data = await api.get<{ data: TasksResponse }>("/api/tasks");
  return data.data;
}

/**
 * Hook to fetch tasks (specs from ALL projects' .agent/specs/todo/ and planning sessions)
 * Results are cached for 30s on the server
 */
export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    staleTime: 30000, // Match server cache TTL
  });
}
