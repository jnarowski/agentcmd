import { useState, useEffect, useMemo } from "react";
import { searchFiles } from "@/client/utils/searchFiles";
import type { FileItem } from "@/client/pages/projects/files/utils/fileUtils";

// PUBLIC API

export interface UseFileSearchOptions {
  /** Maximum number of results to return (default: 50) */
  maxResults?: number;
  /** Filter files by extension(s). Examples: ".ts", [".ts", ".tsx"] */
  extensionFilter?: string | string[];
}

export interface UseFileSearchResult {
  /** Filtered and scored file results */
  results: FileItem[];
  /** Total count of results before maxResults limit */
  totalCount: number;
  /** Whether search is currently debouncing */
  isSearching: boolean;
  /** The debounced query value (150ms delay) */
  debouncedQuery: string;
}

/**
 * Hook for debounced file search with optional extension filtering
 *
 * Provides 150ms debounced search with intelligent scoring across path,
 * directory, and filename. Supports optional extension filtering.
 *
 * @example Basic usage
 * ```tsx
 * const { results } = useFileSearch(query, files);
 * ```
 *
 * @example With extension filter
 * ```tsx
 * const { results } = useFileSearch(query, files, {
 *   extensionFilter: ['.ts', '.tsx']
 * });
 * ```
 *
 * @example With maxResults and loading state
 * ```tsx
 * const { results, isSearching, totalCount } = useFileSearch(query, files, {
 *   maxResults: 100
 * });
 * ```
 *
 * @param query - Search query string
 * @param files - Array of FileItem objects to search
 * @param options - Optional configuration
 * @returns Search results with metadata
 */
export function useFileSearch(
  query: string,
  files: FileItem[],
  options?: UseFileSearchOptions
): UseFileSearchResult {
  const { maxResults = 50, extensionFilter } = options || {};

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query (150ms)
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Filter files by extension if provided
  const filteredByExtension = useMemo(() => {
    if (!extensionFilter) {
      return files;
    }

    const extensions = Array.isArray(extensionFilter)
      ? extensionFilter
      : [extensionFilter];

    // Normalize extensions (add leading dot if missing)
    const normalizedExtensions = extensions.map((ext) =>
      ext.startsWith(".") ? ext.slice(1) : ext
    );

    return files.filter((file) =>
      normalizedExtensions.includes(file.extension)
    );
  }, [files, extensionFilter]);

  // Search with debounced query
  const results = useMemo(() => {
    if (!debouncedQuery) {
      return filteredByExtension.slice(0, maxResults);
    }

    return searchFiles(debouncedQuery, filteredByExtension, {
      maxResults,
      useFuzzyFallback: true,
    });
  }, [debouncedQuery, filteredByExtension, maxResults]);

  return {
    results,
    totalCount: results.length,
    isSearching,
    debouncedQuery,
  };
}
