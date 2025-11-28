import Fuse from "fuse.js";
import type { FileItem } from "@/client/pages/projects/files/utils/fileUtils";

// Module constants
const DEFAULT_MAX_RESULTS = 50;
const DEFAULT_FUZZY_THRESHOLD = 0.5;

// Score tier constants
const SCORE_EXACT_PATH = 1000;
const SCORE_PATH_PREFIX = 800;
const SCORE_EXACT_SEGMENT = 600;
const SCORE_PREFIX_SEGMENT = 400;
const SCORE_CONTAINS_SEGMENT = 300;
const SCORE_EXACT_FILENAME = 299;
const SCORE_PREFIX_FILENAME = 250;
const SCORE_CONTAINS_FILENAME = 200;
const SCORE_CONTAINS_DIRECTORY = 150;

// PUBLIC API

/**
 * Search options for file search
 */
export interface SearchOptions {
  /** Maximum number of results to return (default: 50) */
  maxResults?: number;
  /** Whether to use fuzzy search as fallback (default: true) */
  useFuzzyFallback?: boolean;
}

/**
 * Searches files with intelligent scoring across path, directory, and filename.
 *
 * Supports:
 * - Path queries: "todo/spec.md", "todo/2511271430"
 * - Folder queries: "todo", "2511271430", "containers"
 * - Filename queries: "spec.md", "spec"
 *
 * Prioritizes exact matches over prefix matches over substring matches.
 * Case-insensitive search with intelligent ranking.
 *
 * @param query - Search query (case-insensitive)
 * @param files - Array of FileItem objects to search
 * @param options - Search configuration
 * @returns Sorted array of matching files (best matches first)
 */
export function searchFiles(
  query: string,
  files: FileItem[],
  options?: SearchOptions
): FileItem[] {
  const maxResults = options?.maxResults ?? DEFAULT_MAX_RESULTS;
  const useFuzzyFallback = options?.useFuzzyFallback ?? true;

  // Handle empty query
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return files;
  }

  const normalizedQuery = trimmedQuery.toLowerCase();
  const isPathQuery = normalizedQuery.includes("/");

  // Score all files
  const scoredResults: Array<{ file: FileItem; score: number }> = [];

  for (const file of files) {
    const score = calculateScore(normalizedQuery, file, isPathQuery);
    if (score > 0) {
      scoredResults.push({ file, score });
    }
  }

  // If no matches and fuzzy fallback enabled, use Fuse.js
  if (scoredResults.length === 0 && useFuzzyFallback) {
    return fuzzySearch(normalizedQuery, files, maxResults);
  }

  // Sort by score descending, then filename length ascending (tiebreaker)
  scoredResults.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.file.filename.length - b.file.filename.length;
  });

  // Cap results and extract files
  return scoredResults.slice(0, maxResults).map((r) => r.file);
}

/**
 * Scores a path match (exact, prefix, or contains)
 * Returns 0 if no match, 550-1000 for matches
 */
export function scorePathMatch(query: string, fullPath: string): number {
  const normalizedPath = fullPath.toLowerCase();

  // Exact path match
  if (normalizedPath === query) {
    return SCORE_EXACT_PATH - Math.min(fullPath.length / 100, 100);
  }

  // Path prefix match
  if (normalizedPath.startsWith(query)) {
    const remaining = fullPath.length - query.length;
    return SCORE_PATH_PREFIX - Math.min(remaining / 100, 99);
  }

  // Path contains match (for partial paths like "todo/spec.md" in ".agent/specs/todo/spec.md")
  if (normalizedPath.includes(query)) {
    // Higher score if query appears later (more specific)
    const position = normalizedPath.indexOf(query);
    const positionBonus = Math.floor(position / 5); // Bonus for appearing later in path
    return 550 + Math.min(positionBonus, 49);
  }

  return 0;
}

/**
 * Scores a single directory segment match
 * Returns 0 if no match, 300-699 for matches
 */
export function scoreSegmentMatch(query: string, segment: string): number {
  const normalizedQuery = query.toLowerCase();
  const normalizedSegment = segment.toLowerCase();

  // Exact segment match
  if (normalizedSegment === normalizedQuery) {
    const coverage = normalizedQuery.length / segment.length;
    return SCORE_EXACT_SEGMENT + Math.floor(coverage * 99);
  }

  // Prefix segment match
  if (normalizedSegment.startsWith(normalizedQuery)) {
    const coverage = normalizedQuery.length / segment.length;
    return SCORE_PREFIX_SEGMENT + Math.floor(coverage * 99);
  }

  // Contains in segment
  if (normalizedSegment.includes(normalizedQuery)) {
    const position = normalizedSegment.indexOf(normalizedQuery);
    const positionBonus = Math.max(0, 50 - position);
    return SCORE_CONTAINS_SEGMENT + positionBonus;
  }

  return 0;
}

/**
 * Scores directory by finding best matching segment
 * Returns 0 if no match, 100-699 for matches
 */
export function scoreDirectorySegments(
  query: string,
  directory: string
): number {
  // Split directory into segments
  const segments = directory.split("/").filter(Boolean);

  // Find best matching segment
  let bestScore = 0;
  for (const segment of segments) {
    const score = scoreSegmentMatch(query, segment);
    if (score > bestScore) {
      bestScore = score;
    }
  }

  // If no segment match, check if query is substring of entire directory
  if (bestScore === 0 && directory.toLowerCase().includes(query)) {
    const position = directory.toLowerCase().indexOf(query);
    const positionBonus = Math.max(0, 30 - position / 2);
    return SCORE_CONTAINS_DIRECTORY + positionBonus;
  }

  return bestScore;
}

/**
 * Scores a filename match
 * Returns 0 if no match, 200-299 for matches
 */
export function scoreFilenameMatch(query: string, filename: string): number {
  const normalizedQuery = query.toLowerCase();
  const normalizedFilename = filename.toLowerCase();

  // Exact filename match
  if (normalizedFilename === normalizedQuery) {
    return SCORE_EXACT_FILENAME;
  }

  // Prefix filename match
  if (normalizedFilename.startsWith(normalizedQuery)) {
    const lengthPenalty = Math.min(filename.length / 10, 40);
    return SCORE_PREFIX_FILENAME + (49 - lengthPenalty);
  }

  // Contains in filename
  if (normalizedFilename.includes(normalizedQuery)) {
    const position = normalizedFilename.indexOf(normalizedQuery);
    const positionBonus = Math.max(0, 40 - position);
    return SCORE_CONTAINS_FILENAME + positionBonus;
  }

  return 0;
}

/**
 * Detects whether query is a path query or filename query
 */
export function detectQueryType(query: string): "path" | "filename" {
  return query.includes("/") ? "path" : "filename";
}

// PRIVATE HELPERS

/**
 * Calculates total score for a file based on query
 */
function calculateScore(
  normalizedQuery: string,
  file: FileItem,
  isPathQuery: boolean
): number {
  let bestScore = 0;

  // Always check path matches (highest priority)
  const pathScore = scorePathMatch(normalizedQuery, file.fullPath);
  if (pathScore > bestScore) {
    bestScore = pathScore;
  }

  // Check directory segments
  const dirScore = scoreDirectorySegments(normalizedQuery, file.directory);
  if (dirScore > bestScore) {
    bestScore = dirScore;
  }

  // Check filename (lower priority for path queries)
  if (!isPathQuery || bestScore === 0) {
    const filenameScore = scoreFilenameMatch(normalizedQuery, file.filename);
    if (filenameScore > bestScore) {
      bestScore = filenameScore;
    }
  }

  return bestScore;
}

/**
 * Performs fuzzy search using Fuse.js as fallback
 */
function fuzzySearch(
  query: string,
  files: FileItem[],
  maxResults: number
): FileItem[] {
  const fuse = new Fuse(files, {
    keys: [
      { name: "filename", weight: 0.5 },
      { name: "directory", weight: 0.3 },
      { name: "fullPath", weight: 0.2 },
    ],
    threshold: DEFAULT_FUZZY_THRESHOLD,
    includeScore: true,
  });

  const results = fuse.search(query, { limit: maxResults });
  return results.map((result) => result.item);
}
