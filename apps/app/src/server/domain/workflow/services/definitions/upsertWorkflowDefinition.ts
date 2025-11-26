import { prisma } from "@/shared/prisma";
import type { UpsertWorkflowDefinitionOptions } from "../../types/UpsertWorkflowDefinitionOptions";
import type { WorkflowDefinition } from "@prisma/client";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Atomic create-or-update using compound unique key
 * Perfect for workflow scanning (sync filesystem → DB)
 * Always successful (creates if missing, updates if exists)
 */
export async function upsertWorkflowDefinition(
  options: UpsertWorkflowDefinitionOptions
): Promise<WorkflowDefinition> {
  const { where, create, update, include } = options;

  // Default include: _count.runs
  const includeConfig = include ?? {
    _count: {
      select: {
        runs: true,
      },
    },
  };

  const definition = await prisma.workflowDefinition.upsert({
    where,
    create,
    update,
    include: includeConfig,
  });

  return definition;
}
