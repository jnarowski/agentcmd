import { prisma } from '@/shared/prisma';
import type { WorkflowRunStep } from '@prisma/client';

/**
 * Get a workflow execution step by ID
 * Includes: agent session
 */
export async function getWorkflowStepById(id: string): Promise<WorkflowRunStep | null> {
  const step = await prisma.workflowRunStep.findUnique({
    where: { id },
    include: {
      session: true, // Agent session if present
    },
  });

  return step;
}
