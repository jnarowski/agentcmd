import { useNavigationStore } from "@/client/stores/index";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import type { Project } from "@/shared/types/project.types";

/**
 * Return type for useActiveProject hook
 */
export interface UseActiveProjectReturn {
  /** The active project object, or null if no project is active */
  project: Project | null;
  /** The active project ID, or null if no project is active */
  projectId: string | null;
  /** Whether the projects query is loading */
  isLoading: boolean;
  /** Query error, if any */
  error: Error | null;
}

/**
 * Hook to get the currently active project
 *
 * Combines the navigationStore's activeProjectId with React Query's projects data
 * to provide convenient access to the current project context.
 *
 * @example
 * ```typescript
 * const { project, projectId, isLoading } = useActiveProject();
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (!project) return <div>No project selected</div>;
 *
 * return <div>Active project: {project.name}</div>;
 * ```
 */
export function useActiveProject(): UseActiveProjectReturn {
  const activeProjectId = useNavigationStore((state) => state.activeProjectId);
  const projectsQuery = useProjects();

  const project =
    projectsQuery.data?.find((p) => p.id === activeProjectId) ?? null;

  return {
    project,
    projectId: activeProjectId,
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
  };
}
