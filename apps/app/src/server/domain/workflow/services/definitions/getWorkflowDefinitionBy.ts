import { prisma } from "@/shared/prisma";
import type { GetWorkflowDefinitionByOptions } from "../../types/GetWorkflowDefinitionByOptions";
import type { WorkflowDefinition } from "@prisma/client";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get single workflow definition by any filter combination (O(n) query)
 * Uses findFirst for flexible non-unique lookups
 * Returns null if not found (routes handle error throwing)
 */
export async function getWorkflowDefinitionBy(
  options: GetWorkflowDefinitionByOptions
): Promise<WorkflowDefinition | null> {
  const { where, orderBy, include } = options;

  // Default include: _count.runs
  const includeConfig = include ?? {
    _count: {
      select: {
        runs: true,
      },
    },
  };

  const definition = await prisma.workflowDefinition.findFirst({
    where,
    orderBy,
    include: includeConfig,
  });

  return definition;
}
