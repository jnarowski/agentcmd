import { prisma } from "@/shared/prisma";
import type { CreateWorkflowDefinitionOptions } from "../../types/CreateWorkflowDefinitionOptions";
import type { WorkflowDefinition } from "@prisma/client";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create new workflow definition with validation
 * Validates project exists before creating
 * Returns created definition or null if project not found
 */
export async function createWorkflowDefinition(
  options: CreateWorkflowDefinitionOptions
): Promise<WorkflowDefinition | null> {
  const { data, include } = options;

  // Default include: _count.runs
  const includeConfig = include ?? {
    _count: {
      select: {
        runs: true,
      },
    },
  };

  try {
    const definition = await prisma.workflowDefinition.create({
      data,
      include: includeConfig,
    });

    return definition;
  } catch (error) {
    // Foreign key constraint failure (project doesn't exist)
    if (error instanceof Error && error.message.includes("Foreign key constraint")) {
      return null;
    }
    throw error;
  }
}
