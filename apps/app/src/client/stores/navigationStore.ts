import { create } from "zustand";

/**
 * NavigationStore state and actions
 * Tracks the currently active project and session IDs
 */
export interface NavigationStore {
  // State
  activeProjectId: string | null;
  activeSessionId: string | null;

  // Actions
  /**
   * Set the active project ID
   * @param projectId - The project ID to set as active
   */
  setActiveProject: (projectId: string | null) => void;

  /**
   * Set the active session ID
   * @param sessionId - The session ID to set as active
   */
  setActiveSession: (sessionId: string | null) => void;

  /**
   * Clear both active project and session IDs
   */
  clearNavigation: () => void;
}

/**
 * Navigation store for tracking active project and session
 * Used by layouts and pages to sync URL with global navigation state
 */
export const useNavigationStore = create<NavigationStore>((set) => ({
  // Initial state
  activeProjectId: null,
  activeSessionId: null,

  // Set active project
  setActiveProject: (projectId) => {
    set({ activeProjectId: projectId });
  },

  // Set active session
  setActiveSession: (sessionId) => {
    set({ activeSessionId: sessionId });
  },

  // Clear navigation
  clearNavigation: () => {
    set({
      activeProjectId: null,
      activeSessionId: null,
    });
  },
}));
