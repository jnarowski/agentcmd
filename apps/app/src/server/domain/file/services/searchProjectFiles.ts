import fs from "fs/promises";
import path from "path";
import { getProjectById } from "@/server/domain/project/services/getProjectById";

// ============================================================================
// PUBLIC API
// ============================================================================

export interface FileSearchResult {
  /** File path relative to project root */
  relativePath: string;
  /** File name */
  name: string;
  /** File type */
  type: "file" | "directory";
}

export interface SearchProjectFilesOptions {
  projectId: string;
  query: string;
  limit?: number;
}

const MAX_DEPTH = 8;
const DEFAULT_LIMIT = 20;
const EXCLUDED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  "coverage",
  ".turbo",
  "__pycache__",
  ".venv",
  "venv",
  ".cache",
]);

const EXCLUDED_EXTENSIONS = new Set([
  ".lock",
  ".log",
  ".map",
  ".min.js",
  ".min.css",
]);

/**
 * Search for files in a project matching a query
 * Returns flat list of relative paths for autocomplete
 */
export async function searchProjectFiles({
  projectId,
  query,
  limit = DEFAULT_LIMIT,
}: SearchProjectFilesOptions): Promise<FileSearchResult[]> {
  const project = await getProjectById({ id: projectId });

  if (!project) {
    throw new Error("Project not found");
  }

  try {
    await fs.access(project.path);
  } catch {
    throw new Error("Project path is not accessible");
  }

  const results: FileSearchResult[] = [];
  const normalizedQuery = query.toLowerCase();

  await scanForMatches(project.path, project.path, normalizedQuery, results, limit, 0);

  // Sort by relevance: exact name match first, then starts with, then contains
  results.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Exact match
    if (aName === normalizedQuery && bName !== normalizedQuery) return -1;
    if (bName === normalizedQuery && aName !== normalizedQuery) return 1;

    // Starts with
    if (aName.startsWith(normalizedQuery) && !bName.startsWith(normalizedQuery)) return -1;
    if (bName.startsWith(normalizedQuery) && !aName.startsWith(normalizedQuery)) return 1;

    // Alphabetical
    return aName.localeCompare(bName);
  });

  return results.slice(0, limit);
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

async function scanForMatches(
  rootPath: string,
  currentPath: string,
  query: string,
  results: FileSearchResult[],
  limit: number,
  depth: number
): Promise<void> {
  if (depth > MAX_DEPTH || results.length >= limit * 2) {
    return;
  }

  try {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= limit * 2) break;

      // Skip excluded directories
      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      // Skip hidden files/dirs except .agent and .claude
      const isHidden = entry.name.startsWith(".");
      const isWorkflowDir = entry.name === ".agent" || entry.name === ".claude";
      if (isHidden && !isWorkflowDir) {
        continue;
      }

      // Skip excluded extensions
      const ext = path.extname(entry.name);
      if (EXCLUDED_EXTENSIONS.has(ext)) {
        continue;
      }

      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);
      const lowerName = entry.name.toLowerCase();
      const lowerPath = relativePath.toLowerCase();

      // Check if matches query (name or path contains query)
      if (lowerName.includes(query) || lowerPath.includes(query)) {
        results.push({
          relativePath,
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
        });
      }

      // Recurse into directories
      if (entry.isDirectory()) {
        await scanForMatches(rootPath, fullPath, query, results, limit, depth + 1);
      }
    }
  } catch {
    // Skip directories with permission errors
  }
}
