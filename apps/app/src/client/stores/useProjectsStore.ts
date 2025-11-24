import { create } from "zustand";

interface ProjectsState {
  // Sync state
  isSyncing: boolean;
  setIsSyncing: (isSyncing: boolean) => void;
}

/**
 * Projects feature store
 * Manages project-related UI state including sync status
 */
export const useProjectsStore = create<ProjectsState>((set) => ({
  isSyncing: false,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}));
