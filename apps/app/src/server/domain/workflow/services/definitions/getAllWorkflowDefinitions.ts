import { prisma } from "@/shared/prisma";
import type { WorkflowDefinitionWithCount } from "./getWorkflowDefinitions";

/**
 * Get all workflow definitions for a user (across all projects)
 *
 * Returns definitions where user is owner OR scope='global'.
 * Used for user-wide views like sidebar activities.
 * Includes run counts for each definition (total and active/pending).
 */
export async function getAllWorkflowDefinitions({
  status,
}: {
  userId?: string;
  status?: "active" | "archived";
}): Promise<WorkflowDefinitionWithCount[]> {
  // For single-user system, return all definitions (global or any project)
  // In multi-user system, would filter by user ownership via project relation
  const definitions = await prisma.workflowDefinition.findMany({
    where: {
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
            in: ["pending", "running", "paused"],
          },
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

  // Sort by name
  return definitionsWithCounts.sort((a, b) => a.name.localeCompare(b.name));
}
