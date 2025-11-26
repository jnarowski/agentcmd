import { prisma } from "@/shared/prisma";
import type { DeleteWorkflowDefinitionOptions } from "../../types/DeleteWorkflowDefinitionOptions";
import type { WorkflowDefinition } from "@prisma/client";
import { Prisma } from "@prisma/client";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Hard delete workflow definition (use sparingly)
 * Prefer updateWorkflowDefinition with status: "archived" for soft delete
 * Returns deleted definition or null if not found
 */
export async function deleteWorkflowDefinition(
  options: DeleteWorkflowDefinitionOptions
): Promise<WorkflowDefinition | null> {
  const { id, include } = options;

  // Default include: _count.runs
  const includeConfig = include ?? {
    _count: {
      select: {
        runs: true,
      },
    },
  };

  try {
    const definition = await prisma.workflowDefinition.delete({
      where: { id },
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
