/**
 * Direct spec move service - moves spec folders between workflow states
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { SpecStatus } from "@/shared/types/spec.types";
import { clearSpecsCache } from "@/server/domain/spec/services/getSpecs";
import { prisma } from "@/shared/prisma";

// TYPES

interface SpecIndexEntry {
  folder?: string;
  path: string;
  status: SpecStatus;
  spec_type?: string | null;
  created: string;
  updated: string;
}

interface SpecIndex {
  specs: Record<string, SpecIndexEntry>;
}

interface MoveSpecParams {
  projectId: string;
  specId: string;
  targetFolder: "backlog" | "todo" | "done";
}

interface MoveSpecResult {
  success: true;
  spec: SpecIndexEntry;
}

// PUBLIC API

/**
 * Move spec folder between workflow states (backlog/todo/done)
 * Updates index.json and clears cache atomically
 */
export async function moveSpec(params: MoveSpecParams): Promise<MoveSpecResult> {
  const { projectId, specId, targetFolder } = params;

  // Get project path
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { path: true },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const projectPath = project.path;
  const indexPath = path.join(projectPath, ".agent", "specs", "index.json");

  // Read and parse index.json
  const fileContent = await fs.readFile(indexPath, "utf-8");
  const index: SpecIndex = JSON.parse(fileContent);

  // Find spec entry
  const spec = index.specs[specId];
  if (!spec) {
    throw new Error(`Spec not found in index: ${specId}`);
  }

  // Validate target folder
  if (!["backlog", "todo", "done"].includes(targetFolder)) {
    throw new Error(`Invalid target folder: ${targetFolder}`);
  }

  // Extract current folder from path
  const currentPath = spec.path;
  const pathParts = currentPath.split("/");
  const currentFolder = pathParts[0];

  // Skip if already in target folder
  if (currentFolder === targetFolder) {
    return { success: true, spec };
  }

  // Build source and target paths
  const specFolder = spec.folder || pathParts[1]; // Use folder field or extract from path
  const sourcePath = path.join(projectPath, ".agent", "specs", currentPath.replace("/spec.md", ""));
  const targetPath = path.join(projectPath, ".agent", "specs", targetFolder, specFolder);

  // Move folder atomically
  try {
    await fs.rename(sourcePath, targetPath);
  } catch (error) {
    throw new Error(`Failed to move folder: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Update spec entry in index
  const newPath = `${targetFolder}/${specFolder}/spec.md`;
  const updatedSpec: SpecIndexEntry = {
    ...spec,
    path: newPath,
    status: mapFolderToStatus(targetFolder, spec.status),
    updated: new Date().toISOString(),
  };

  index.specs[specId] = updatedSpec;

  // Write index.json atomically
  try {
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2) + "\n", "utf-8");
  } catch (error) {
    // Try to rollback folder move
    try {
      await fs.rename(targetPath, sourcePath);
    } catch {
      // Rollback failed, log error
      console.error("Failed to rollback folder move after index write failure");
    }
    throw new Error(`Failed to write index.json: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Clear cache to force refresh
  clearSpecsCache();

  return { success: true, spec: updatedSpec };
}

// PRIVATE HELPERS

/**
 * Map target folder to appropriate status
 */
function mapFolderToStatus(folder: string, currentStatus: SpecStatus): SpecStatus {
  // Map target folder to status
  switch (folder) {
    case "backlog":
      return "backlog";
    case "todo":
      // Keep current status if it's draft or in-progress, otherwise set to draft
      return currentStatus === "in-progress" ? "in-progress" : "draft";
    case "done":
      return "completed";
    default:
      return currentStatus;
  }
}
