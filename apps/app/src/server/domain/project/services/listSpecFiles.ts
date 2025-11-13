import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ListSpecFilesOptions } from "@/server/domain/project/types/ListSpecFilesOptions";

/**
 * List all spec files from .agent/specs/todo/ directory
 * @param options - Options object with projectPath
 * @returns Array of paths relative to project root (e.g., ".agent/specs/todo/241231-feature/spec.md")
 */
export async function listSpecFiles({ projectPath }: ListSpecFilesOptions): Promise<string[]> {
  const specsDir = join(projectPath, ".agent", "specs", "todo");

  try {
    const files = await readdir(specsDir, { recursive: true, withFileTypes: true });

    // Filter for markdown files only
    const specFiles = files
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".md"))
      .map((dirent) => {
        // Get relative path from specsDir
        // In Node.js 20.1+, dirent has path property (not in all TS types)
        const direntPath = (dirent as { path?: string }).path;
        const relativeToSpecsDir = direntPath
          ? join(direntPath.replace(specsDir, ""), dirent.name)
          : dirent.name;

        // Remove leading slash if present
        const cleanPath = relativeToSpecsDir.startsWith("/")
          ? relativeToSpecsDir.slice(1)
          : relativeToSpecsDir;

        // Return path relative to project root (include .agent/specs/todo/)
        return join(".agent", "specs", "todo", cleanPath);
      })
      .sort(); // Alphabetical order

    return specFiles;
  } catch (error) {
    // If directory doesn't exist or is not readable, return empty array
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
