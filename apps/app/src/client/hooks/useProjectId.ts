import { useParams } from "react-router-dom";

/**
 * Get project ID from URL params
 *
 * Handles route param naming differences:
 * - /projects/:id/* routes use "id"
 * - Legacy routes may use "projectId"
 *
 * @returns projectId from URL params
 *
 * @example
 * ```tsx
 * function ProjectPage() {
 *   const projectId = useProjectId();
 *   const { data: project } = useProject(projectId);
 *   // ...
 * }
 * ```
 */
export function useProjectId(): string {
  const { projectId, id } = useParams<{ projectId?: string; id?: string }>();
  const activeProjectId = projectId || id;

  if (!activeProjectId) {
    throw new Error("useProjectId must be used within a project route (missing :id or :projectId param)");
  }

  return activeProjectId;
}
