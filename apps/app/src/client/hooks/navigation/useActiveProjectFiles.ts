import { useNavigationStore } from "@/client/stores/index";
import { useProjectFiles } from "@/client/pages/projects/files/hooks/useFiles";
import type { FileTreeItem } from "@/shared/types/file.types";

/**
 * Return type for useActiveProjectFiles hook
 */
export interface UseActiveProjectFilesReturn {
  /** Array of file tree items for the active project */
  files: FileTreeItem[];
  /** The active project ID, or null if no project is active */
  projectId: string | null;
  /** Whether the files query is loading */
  isLoading: boolean;
  /** Query error, if any */
  error: Error | null;
}

/**
 * Hook to get files for the currently active project
 *
 * Combines the navigationStore's activeProjectId with React Query's files data.
 *
 * @example
 * ```typescript
 * const { files, projectId, isLoading } = useActiveProjectFiles();
 *
 * if (isLoading) return <div>Loading files...</div>;
 * if (files.length === 0) return <div>No files found</div>;
 *
 * return <FileTree files={files} />;
 * ```
 */
export function useActiveProjectFiles(): UseActiveProjectFilesReturn {
  const activeProjectId = useNavigationStore((state) => state.activeProjectId);

  const filesQuery = useProjectFiles(activeProjectId || "");

  return {
    files: filesQuery.data ?? [],
    projectId: activeProjectId,
    isLoading: filesQuery.isLoading,
    error: filesQuery.error,
  };
}
