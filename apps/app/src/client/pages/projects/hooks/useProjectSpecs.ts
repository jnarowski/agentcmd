import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { projectKeys } from "./queryKeys";
import type { Spec, SpecStatus } from "@/shared/types/spec.types";

interface UseProjectSpecsOptions {
  status?: SpecStatus | SpecStatus[];
  enabled?: boolean;
}

/**
 * Fetch available spec tasks for a project with optional status filtering
 */
export function useProjectSpecs(
  projectId: string,
  options?: UseProjectSpecsOptions
) {
  const { status, enabled = true } = options || {};

  return useQuery({
    queryKey: projectKeys.specs(projectId, status),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) {
        const statusParam = Array.isArray(status)
          ? status.join(',')
          : status;
        params.append('status', statusParam);
      }

      const url = `/api/projects/${projectId}/specs${params.toString() ? `?${params}` : ''}`;
      const response = await api.get<{ data: Spec[] }>(url);
      return response.data;
    },
    enabled,
  });
}
