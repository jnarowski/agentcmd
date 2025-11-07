import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Find all workflow files in a directory (recursive)
 * @param dir - Directory to search
 * @returns Array of file paths
 */
export async function findWorkflowFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        files.push(...(await findWorkflowFiles(fullPath)));
      } else if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) {
        // Include .ts and .js files
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or not readable
    return [];
  }

  return files;
}
