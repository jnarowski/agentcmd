/**
 * TanStack Query hook for fetching specs and planning sessions
 */

import { useQuery } from "@tanstack/react-query";
import type { SpecsResponse } from "@/shared/types/spec.types";
import { api } from "@/client/utils/api";

/**
 * Fetch specs from the API (optionally filtered by project)
 */
async function fetchSpecs(projectId?: string | null): Promise<SpecsResponse> {
  const params = new URLSearchParams();
  if (projectId) {
    params.append('project_id', projectId);
  }
  const url = `/api/specs${params.toString() ? `?${params.toString()}` : ''}`;
  const data = await api.get<{ data: SpecsResponse }>(url);
  return data.data;
}

/**
 * Hook to fetch specs and planning sessions, optionally filtered by project
 * Results are cached for 30s on the server
 */
export function useSpecs(projectId?: string | null) {
  return useQuery({
    queryKey: ["specs", projectId],
    queryFn: () => fetchSpecs(projectId),
    staleTime: 30000, // Match server cache TTL
  });
}
