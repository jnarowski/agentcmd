import { prisma } from "@/shared/prisma";
import type { WorkflowDefinition } from "@prisma/client";

export type WorkflowDefinitionWithCount = WorkflowDefinition & {
  _count: {
    runs: number;
    activeRuns: number;
  };
};

/**
 * Get workflow definitions with optional status filtering
 * Includes run counts for each definition (total and active/pending)
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
      runs: {
        where: {
          status: {
            in: ['pending', 'running', 'paused']
          }
        },
        select: {
          id: true,
        },
      },
    },
  });

  // Transform to include activeRuns count
  const definitionsWithCounts = definitions.map((def) => ({
    ...def,
    _count: {
      runs: def._count.runs,
      activeRuns: def.runs.length,
    },
    runs: undefined, // Remove the runs array from response
  })) as WorkflowDefinitionWithCount[];

  // Sort: project workflows first (by name), then global workflows (by name)
  const sorted = definitionsWithCounts.sort((a, b) => {
    // Project workflows come before global
    if (a.project_id === projectId && b.scope === "global") return -1;
    if (a.scope === "global" && b.project_id === projectId) return 1;

    // Within same scope, sort by name
    return a.name.localeCompare(b.name);
  });

  return sorted;
}
