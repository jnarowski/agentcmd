import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  FileTreeItem,
  FilesResponse,
} from "@/shared/types/file.types";
import { api } from "@/client/utils/api-client";

// Query keys factory - centralized key management
export const fileKeys = {
  all: ["files"] as const,
  projects: () => [...fileKeys.all, "project"] as const,
  project: (projectId: string) => [...fileKeys.projects(), projectId] as const,
};

/**
 * Fetch file tree for a project
 */
async function fetchProjectFiles(projectId: string): Promise<FileTreeItem[]> {
  const data = await api.get<FilesResponse>(`/api/projects/${projectId}/files`);
  return data.data;
}

/**
 * Hook to fetch file tree for a project
 */
export function useProjectFiles(projectId: string): UseQueryResult<FileTreeItem[], Error> {
  return useQuery({
    queryKey: fileKeys.project(projectId),
    queryFn: () => fetchProjectFiles(projectId),
    enabled: !!projectId, // Only run if projectId is provided
  });
}
