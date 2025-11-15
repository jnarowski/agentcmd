import { prisma } from "@/shared/prisma";
import type { GetWorkflowDefinitionOptions } from "../../types/GetWorkflowDefinitionOptions";
import type { WorkflowDefinition } from "@prisma/client";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get single workflow definition by unique constraint (O(1) indexed lookup)
 * Supports id OR project_id_identifier compound key
 * Returns null if not found (routes handle error throwing)
 */
export async function getWorkflowDefinition(
  options: GetWorkflowDefinitionOptions
): Promise<WorkflowDefinition | null> {
  const { where, include } = options;

  // Default include: _count.runs
  const includeConfig = include ?? {
    _count: {
      select: {
        runs: true,
      },
    },
  };

  const definition = await prisma.workflowDefinition.findUnique({
    where,
    include: includeConfig,
  });

  return definition;
}
