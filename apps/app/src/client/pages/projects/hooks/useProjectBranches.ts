import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { projectKeys } from "./queryKeys";

interface Branch {
  name: string;
  current: boolean;
}

/**
 * Fetch available git branches for a project
 */
export function useProjectBranches(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.branches(projectId),
    queryFn: async () => {
      const response = await api.get<{ data: Branch[] }>(
        `/api/projects/${projectId}/branches`
      );
      return response.data;
    },
    enabled,
  });
}
