import { prisma } from "@/shared/prisma";
import type { WorkflowDefinition } from "@prisma/client";

export type WorkflowDefinitionWithCount = WorkflowDefinition & {
  _count: {
    runs: number;
  };
};

/**
 * Get workflow definitions with optional status filtering
 * Includes run counts for each definition
 * Returns project workflows first, then global workflows (sorted by name within each group)
 */
export async function getWorkflowDefinitions(
  projectId: string,
  status?: "active" | "archived"
): Promise<WorkflowDefinitionWithCount[]> {
  const definitions = await prisma.workflowDefinition.findMany({
    where: {
      OR: [
        { project_id: projectId },
        { scope: "global" }
      ],
      ...(status && { status }),
    },
    include: {
      _count: {
        select: {
          runs: true,
        },
      },
    },
  });

  // Sort: project workflows first (by name), then global workflows (by name)
  const sorted = definitions.sort((a, b) => {
    // Project workflows come before global
    if (a.project_id === projectId && b.scope === "global") return -1;
    if (a.scope === "global" && b.project_id === projectId) return 1;

    // Within same scope, sort by name
    return a.name.localeCompare(b.name);
  });

  return sorted;
}
