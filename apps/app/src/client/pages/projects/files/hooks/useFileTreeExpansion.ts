import { useEffect } from "react";
import type { FileTreeItem } from "@/shared/types/file.types";

export interface UseFileTreeExpansionParams {
  searchQuery: string;
  files: FileTreeItem[] | undefined;
  expandMultipleDirs: (paths: string[]) => void;
}

/**
 * Custom hook for managing file tree auto-expansion during search.
 *
 * Automatically expands directories that contain matching files when a search query is active.
 * Uses batch expansion to minimize store updates (O(1) instead of O(n)).
 *
 * @param params.searchQuery - Current search query
 * @param params.files - File tree data
 * @param params.expandMultipleDirs - Function to batch-expand multiple directories
 *
 * @example
 * ```tsx
 * const expandMultipleDirs = useFilesStore((s) => s.expandMultipleDirs);
 *
 * useFileTreeExpansion({
 *   searchQuery,
 *   files,
 *   expandMultipleDirs
 * });
 * ```
 */
export function useFileTreeExpansion({
  searchQuery,
  files,
  expandMultipleDirs,
}: UseFileTreeExpansionParams) {
  useEffect(() => {
    if (searchQuery && files) {
      const pathsToExpand: string[] = [];

      function collectExpandedPaths(
        items: FileTreeItem[],
        currentPath: string[] = []
      ) {
        for (const item of items) {
          if (item.type === "directory") {
            const itemPath = [...currentPath, item.name];

            // Check if this directory or any children match the search
            function hasMatch(node: FileTreeItem): boolean {
              if (node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return true;
              }
              if (node.children) {
                return node.children.some(hasMatch);
              }
              return false;
            }

            if (hasMatch(item)) {
              // Collect path for batch expansion
              pathsToExpand.push(item.path);
            }

            if (item.children) {
              collectExpandedPaths(item.children, itemPath);
            }
          }
        }
      }

      collectExpandedPaths(files);

      // Single store update with all paths
      if (pathsToExpand.length > 0) {
        expandMultipleDirs(pathsToExpand);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, files]);
}
