import { prisma } from "@/shared/prisma";
import type { WorkflowDefinition } from "@prisma/client";

/**
 * Archives a workflow definition
 * Sets status to 'archived' and updates archived_at timestamp
 */
export async function archiveWorkflowDefinition(
  definitionId: string
): Promise<WorkflowDefinition | null> {
  try {
    const definition = await prisma.workflowDefinition.update({
      where: { id: definitionId },
      data: {
        status: "archived",
        archived_at: new Date(),
      },
    });

    return definition;
  } catch {
    // If definition not found, return null (routes will handle 404)
    return null;
  }
}
