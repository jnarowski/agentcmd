import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  FileTreeItem,
  FilesResponse,
} from "@/shared/types/file.types";
import { api } from "@/client/utils/api";
import { fileKeys } from "./queryKeys";

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
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
