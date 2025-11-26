import { prisma } from "@/shared/prisma";
import type { UpdateWorkflowDefinitionOptions } from "../../types/UpdateWorkflowDefinitionOptions";
import type { WorkflowDefinition } from "@prisma/client";
import { Prisma } from "@prisma/client";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generic update for any workflow definition fields
 * Replaces archive/unarchive functions
 * Returns updated definition or null if not found
 */
export async function updateWorkflowDefinition(
  options: UpdateWorkflowDefinitionOptions
): Promise<WorkflowDefinition | null> {
  const { id, data, include } = options;

  // Default include: _count.runs
  const includeConfig = include ?? {
    _count: {
      select: {
        runs: true,
      },
    },
  };

  try {
    const definition = await prisma.workflowDefinition.update({
      where: { id },
      data,
      include: includeConfig,
    });

    return definition;
  } catch (error) {
    // Handle record not found error (P2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }
    throw error;
  }
}
