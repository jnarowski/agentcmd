/**
 * Scan .agent/specs/index.json and filter for todo/ specs
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { SpecTask } from "@/shared/types/task.types";

interface SpecIndexEntry {
  path: string;
  status: string;
  created: string;
  updated: string;
}

interface SpecIndex {
  lastId: number;
  specs: Record<string, SpecIndexEntry>;
}

/**
 * Read specs index.json and return SpecTask[] for todo/ folder
 * @param projectPath - Absolute path to the project directory
 * @param projectId - Project ID to associate with tasks
 */
export async function scanSpecs(projectPath: string, projectId: string): Promise<SpecTask[]> {
  const indexPath = path.join(projectPath, ".agent", "specs", "index.json");

  try {
    const fileContent = await fs.readFile(indexPath, "utf-8");
    const index: SpecIndex = JSON.parse(fileContent);

    const specTasks: SpecTask[] = [];

    for (const [id, entry] of Object.entries(index.specs)) {
      // Only include specs in todo/ folder
      if (!entry.path.startsWith("todo/")) {
        continue;
      }

      // Extract name from path (e.g., "todo/251112070556-tasks-nav-workflow-integration" -> "tasks-nav-workflow-integration")
      const pathParts = entry.path.split("/");
      const folderName = pathParts[pathParts.length - 1];
      const namePart = folderName.split("-").slice(1).join("-"); // Remove timestamp prefix
      const displayName = namePart
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      specTasks.push({
        id,
        name: displayName,
        specPath: entry.path,
        projectId, // Set from parameter
        status: entry.status,
        created_at: entry.created,
      });
    }

    return specTasks;
  } catch (error) {
    console.error(`Failed to scan specs for project ${projectId}:`, error);
    return [];
  }
}
