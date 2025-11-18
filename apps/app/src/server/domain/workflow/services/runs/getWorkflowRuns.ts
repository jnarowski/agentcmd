import { prisma } from '@/shared/prisma';
import type { WorkflowRunFilters } from '../../types';
import type { WorkflowRun } from '@prisma/client';

/**
 * Query workflow runs with filters (optimized for list views)
 *
 * Returns minimal data for displaying runs in list/board views:
 * - 8 core fields (id, name, status, current_phase, workflow_definition_id, started_at, created_at)
 * - workflow_definition.name and workflow_definition.phases (for phase progress)
 * - _count.steps (for step count badge)
 *
 * This reduces payload size by ~95% compared to full nested data (500 bytes vs 10KB per run)
 * For detail views, use `getWorkflowRunById` which fetches full nested data
 */
export async function getWorkflowRuns(
  filters: WorkflowRunFilters
): Promise<WorkflowRun[]> {
  const runs = await prisma.workflowRun.findMany({
    where: {
      ...(filters.project_id && { project_id: filters.project_id }),
      ...(filters.user_id && { user_id: filters.user_id }),
      ...(filters.status && {
        status: Array.isArray(filters.status)
          ? { in: filters.status }
          : filters.status
      }),
      ...(filters.search && {
        name: {
          contains: filters.search,
        },
      }),
      ...(filters.definition_id && { workflow_definition_id: filters.definition_id }),
    },
    select: {
      id: true,
      name: true,
      status: true,
      current_phase: true,
      workflow_definition_id: true,
      project_id: true,
      started_at: true,
      created_at: true,
      workflow_definition: {
        select: {
          name: true,
          phases: true,
        },
      },
      _count: {
        select: {
          steps: true,
        },
      },
    },
    orderBy: [{ started_at: 'desc' }, { created_at: 'desc' }],
  });

  // Parse JSON fields (Prisma stores JSON as strings in SQLite)
  const parsedRuns = runs.map((run) => ({
    ...run,
    workflow_definition: {
      name: run.workflow_definition.name,
      phases: typeof run.workflow_definition.phases === 'string'
        ? JSON.parse(run.workflow_definition.phases)
        : run.workflow_definition.phases,
    },
  }));

  return parsedRuns as unknown as WorkflowRun[];
}
