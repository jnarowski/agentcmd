/**
 * Scan .agent/specs/index.json and filter for todo/ specs
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { Spec, SpecStatus } from "@/shared/types/spec.types";

interface SpecIndexEntry {
  path: string;
  status: SpecStatus;
  spec_type?: string | null;
  created: string;
  updated: string;
  totalComplexity?: number;
  phaseCount?: number;
  taskCount?: number;
}

interface SpecIndex {
  lastId: number;
  specs: Record<string, SpecIndexEntry>;
}

/**
 * Read specs index.json and return Spec[] (includes all statuses)
 * @param projectPath - Absolute path to the project directory
 * @param projectId - Project ID to associate with specs
 */
export async function scanSpecs(projectPath: string, projectId: string): Promise<Spec[]> {
  const indexPath = path.join(projectPath, ".agent", "specs", "index.json");

  try {
    const fileContent = await fs.readFile(indexPath, "utf-8");
    const index: SpecIndex = JSON.parse(fileContent);

    const specs: Spec[] = [];

    for (const [id, entry] of Object.entries(index.specs)) {

      // Read spec.md file to extract header
      const specFilePath = path.join(projectPath, ".agent", "specs", entry.path);
      let displayName = id; // Fallback to ID

      try {
        const specContent = await fs.readFile(specFilePath, "utf-8");
        // Extract first H1 header (# Title)
        const headerMatch = specContent.match(/^#\s+(.+)$/m);
        if (headerMatch) {
          displayName = headerMatch[1].trim();
        }
      } catch {
        // If file read fails, fall back to generating name from path
        const pathParts = entry.path.split("/");
        // Get folder name (second-to-last part before spec.md)
        const folderName = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
        const namePart = folderName.split("-").slice(1).join("-"); // Remove timestamp prefix
        displayName = namePart
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }

      specs.push({
        id,
        name: displayName,
        specPath: entry.path,
        projectId, // Set from parameter
        status: entry.status,
        spec_type: entry.spec_type ?? "feature", // Default to "feature" for legacy specs
        created_at: entry.created,
        totalComplexity: entry.totalComplexity,
        phaseCount: entry.phaseCount,
        taskCount: entry.taskCount,
      });
    }

    return specs;
  } catch (error) {
    console.error(`Failed to scan specs for project ${projectId}:`, error);
    return [];
  }
}
