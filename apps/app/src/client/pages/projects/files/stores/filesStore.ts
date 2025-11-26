import { create } from "zustand";

/**
 * FilesStore state and actions
 * Manages file tree UI state (expanded directories, selected file, search)
 */
export interface FilesStore {
  // State
  expandedDirs: Set<string>;
  selectedFile: string | null;
  searchQuery: string;

  // Actions
  /**
   * Toggle directory expansion state
   * @param path - Directory path to toggle
   */
  toggleDir: (path: string) => void;

  /**
   * Expand a directory
   * @param path - Directory path to expand
   */
  expandDir: (path: string) => void;

  /**
   * Expand multiple directories at once (batch operation)
   * @param paths - Array of directory paths to expand
   */
  expandMultipleDirs: (paths: string[]) => void;

  /**
   * Collapse a directory
   * @param path - Directory path to collapse
   */
  collapseDir: (path: string) => void;

  /**
   * Set the currently selected file
   * @param path - File path to select
   */
  setSelectedFile: (path: string | null) => void;

  /**
   * Set the search query
   * @param query - Search string
   */
  setSearch: (query: string) => void;

  /**
   * Clear the file selection
   */
  clearSelection: () => void;
}

/**
 * Files store for managing file tree UI state
 * Tracks expanded directories, selected file, and search query
 */
export const useFilesStore = create<FilesStore>((set) => ({
  // Initial state
  expandedDirs: new Set<string>(),
  selectedFile: null,
  searchQuery: "",

  // Toggle directory expansion
  toggleDir: (path) => {
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { expandedDirs: newExpanded };
    });
  },

  // Expand directory
  expandDir: (path) => {
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      newExpanded.add(path);
      return { expandedDirs: newExpanded };
    });
  },

  // Expand multiple directories at once (batch operation)
  expandMultipleDirs: (paths) => {
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      paths.forEach((path) => newExpanded.add(path));
      return { expandedDirs: newExpanded };
    });
  },

  // Collapse directory
  collapseDir: (path) => {
    set((state) => {
      const newExpanded = new Set(state.expandedDirs);
      newExpanded.delete(path);
      return { expandedDirs: newExpanded };
    });
  },

  // Set selected file
  setSelectedFile: (path) => {
    set({ selectedFile: path });
  },

  // Set search query
  setSearch: (query) => {
    set({ searchQuery: query });
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedFile: null });
  },
}));
