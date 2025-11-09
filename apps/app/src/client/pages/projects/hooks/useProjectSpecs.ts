import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { projectKeys } from "./queryKeys";

/**
 * Fetch available spec files for a project
 */
export function useProjectSpecs(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.specs(projectId),
    queryFn: async () => {
      const response = await api.get<{ data: string[] }>(
        `/api/projects/${projectId}/specs`
      );
      return response.data;
    },
    enabled,
  });
}
