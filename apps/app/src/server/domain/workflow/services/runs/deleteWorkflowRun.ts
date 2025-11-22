import { prisma } from "@/shared/prisma";
import { Prisma } from "@prisma/client";
import { rm } from "node:fs/promises";
import { join } from "node:path";

// ============================================================================
// PUBLIC API
// ============================================================================

export interface DeleteWorkflowRunOptions {
  id: string;
}

/**
 * Hard delete workflow run
 * - Cleans up artifact files from disk
 * - Cascades to delete WorkflowRunStep, WorkflowEvent, WorkflowArtifact records
 * Returns deleted run or null if not found
 */
export async function deleteWorkflowRun(
  options: DeleteWorkflowRunOptions
): Promise<{ id: string; name: string } | null> {
  const { id } = options;

  try {
    // Get run with project and artifacts for cleanup
    const run = await prisma.workflowRun.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        project: {
          select: {
            path: true,
          },
        },
        artifacts: {
          select: {
            file_path: true,
          },
        },
      },
    });

    if (!run) {
      return null;
    }

    // Delete artifact files from disk
    const projectPath = run.project.path;
    for (const artifact of run.artifacts) {
      const absolutePath = join(projectPath, artifact.file_path);
      try {
        await rm(absolutePath, { force: true });
      } catch (error) {
        // Log but don't fail - file may already be deleted
        console.warn(`Failed to delete artifact file: ${absolutePath}`, error);
      }
    }

    // Delete the run (cascade deletes steps, events, artifact records)
    await prisma.workflowRun.delete({
      where: { id },
    });

    return { id: run.id, name: run.name };
  } catch (error) {
    // Handle record not found error (P2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
}
