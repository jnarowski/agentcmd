/**
 * Navigation helper hooks
 *
 * These hooks combine navigationStore with React Query to provide
 * convenient access to current navigation context and actions.
 *
 * Usage:
 * ```typescript
 * import { useActiveProject, useActiveSession, useNavigation } from '@/client/hooks/navigation';
 *
 * // Get current project with full data
 * const { project, projectId } = useActiveProject();
 *
 * // Get current session with full data
 * const { session, sessionId } = useActiveSession();
 *
 * // Navigation actions
 * const { goToProject, goToSession } = useNavigation();
 * goToProject('project-123');
 * goToSession('project-123', 'session-456');
 * ```
 */

export { useActiveProject } from "./useActiveProject";
export { useActiveSession } from "./useActiveSession";
export { useActiveProjectFiles } from "./useActiveProjectFiles";
export { useNavigation } from "./useNavigation";

// Type exports
export type { UseActiveProjectReturn } from "./useActiveProject";
export type { UseActiveSessionReturn } from "./useActiveSession";
export type { UseActiveProjectFilesReturn } from "./useActiveProjectFiles";
export type { UseNavigationReturn } from "./useNavigation";
