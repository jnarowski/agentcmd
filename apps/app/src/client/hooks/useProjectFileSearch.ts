import { useQuery } from "@tanstack/react-query";
import { api } from "@/client/utils/api";
import type { FileSearchResult } from "@/shared/types/spec.types";

interface FileSearchResponse {
  data: FileSearchResult[];
}

interface UseProjectFileSearchOptions {
  projectId: string;
  query: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for searching project files via API
 * Used for @ mention autocomplete in spec generation
 */
export function useProjectFileSearch({
  projectId,
  query,
  limit = 20,
  enabled = true,
}: UseProjectFileSearchOptions) {
  return useQuery({
    queryKey: ["project-files-search", projectId, query, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: query,
        ...(limit && { limit: limit.toString() }),
      });
      const response = await api.get<FileSearchResponse>(
        `/api/projects/${projectId}/files/search?${params}`
      );
      return response.data;
    },
    enabled: enabled && !!projectId && query.length >= 1,
    staleTime: 1000 * 30, // 30 seconds
  });
}
