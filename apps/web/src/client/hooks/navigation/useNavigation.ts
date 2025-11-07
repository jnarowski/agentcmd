import { useNavigate } from "react-router-dom";
import { useNavigationStore } from "@/client/stores/index";

/**
 * Return type for useNavigation hook
 */
export interface UseNavigationReturn {
  /** Currently active project ID */
  activeProjectId: string | null;
  /** Currently active session ID */
  activeSessionId: string | null;
  /** Navigate to a project and update the store */
  goToProject: (projectId: string) => void;
  /** Navigate to a session within a project and update the store */
  goToSession: (projectId: string, sessionId: string) => void;
  /** Clear all navigation state */
  clearNavigation: () => void;
}

/**
 * Hook for navigation actions with URL sync
 *
 * Provides navigation functions that update both the navigationStore
 * and the browser URL, keeping them in sync.
 *
 * @example
 * ```typescript
 * const { goToProject, goToSession, activeProjectId } = useNavigation();
 *
 * // Navigate to project details
 * goToProject('project-123');
 *
 * // Navigate to a specific session
 * goToSession('project-123', 'session-456');
 * ```
 */
export function useNavigation(): UseNavigationReturn {
  const navigate = useNavigate();
  const { activeProjectId, activeSessionId, setActiveProject, setActiveSession, clearNavigation } =
    useNavigationStore();

  const goToProject = (projectId: string) => {
    setActiveProject(projectId);
    navigate(`/projects/${projectId}`);
  };

  const goToSession = (projectId: string, sessionId: string) => {
    setActiveProject(projectId);
    setActiveSession(sessionId);
    navigate(`/projects/${projectId}/chat/${sessionId}`);
  };

  return {
    activeProjectId,
    activeSessionId,
    goToProject,
    goToSession,
    clearNavigation,
  };
}
