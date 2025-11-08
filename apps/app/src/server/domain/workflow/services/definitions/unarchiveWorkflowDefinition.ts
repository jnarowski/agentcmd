import { prisma } from "@/shared/prisma";
import type { WorkflowDefinition } from "@prisma/client";

/**
 * Unarchives a workflow definition
 * Sets status to 'active' and clears archived_at timestamp
 */
export async function unarchiveWorkflowDefinition(
  definitionId: string
): Promise<WorkflowDefinition | null> {
  try {
    const definition = await prisma.workflowDefinition.update({
      where: { id: definitionId },
      data: {
        status: "active",
        archived_at: null,
      },
    });

    return definition;
  } catch {
    // If definition not found, return null (routes will handle 404)
    return null;
  }
}
