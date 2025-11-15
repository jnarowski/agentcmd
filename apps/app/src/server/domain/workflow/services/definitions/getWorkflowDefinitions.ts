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
 * Returns workflows sorted by name
 */
export async function getWorkflowDefinitions(
  projectId: string,
  status?: "active" | "archived"
): Promise<WorkflowDefinitionWithCount[]> {
  const definitions = await prisma.workflowDefinition.findMany({
    where: {
      project_id: projectId,
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

  // Transform to include activeRuns count and sort by name
  const definitionsWithCounts = definitions
    .map((def) => ({
      ...def,
      _count: {
        runs: def._count.runs,
        activeRuns: def.runs.length,
      },
      runs: undefined, // Remove the runs array from response
    }))
    .sort((a, b) => a.name.localeCompare(b.name)) as WorkflowDefinitionWithCount[];

  return definitionsWithCounts;
}
