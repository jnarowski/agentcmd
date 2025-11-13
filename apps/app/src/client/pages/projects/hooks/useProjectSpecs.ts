import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import { projectKeys } from "./queryKeys";
import type { SpecTask } from "@/shared/types/task.types";

/**
 * Fetch available spec tasks for a project
 */
export function useProjectSpecs(projectId: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.specs(projectId),
    queryFn: async () => {
      const response = await api.get<{ data: SpecTask[] }>(
        `/api/projects/${projectId}/specs`
      );
      return response.data;
    },
    enabled,
  });
}
