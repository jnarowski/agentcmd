import { prisma } from '@/shared/prisma';
import type { WorkflowRun, WorkflowDefinition, Project } from '@prisma/client';

/**
 * Get workflow run with related data needed for execution.
 * Returns workflow_definition and project without transformations.
 * Used specifically by executeWorkflow to validate and trigger workflow.
 */
export async function getWorkflowRunForExecution(
  runId: string
): Promise<(WorkflowRun & { workflow_definition: WorkflowDefinition | null; project: Project }) | null> {
  return await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: {
      workflow_definition: true,
      project: true,
    },
  });
}
