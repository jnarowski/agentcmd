import { prisma } from '@/shared/prisma';
import type { WorkflowRunStep } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { broadcastWorkflowEvent } from '../events/broadcastWorkflowEvent';
import { WorkflowWebSocketEventTypes } from '@/shared/types/websocket.types';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface UpdateWorkflowStepParams {
  stepId: string;
  status?: StepStatus;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  agentSessionId?: string;
  logger?: FastifyBaseLogger;
}

/**
 * Update workflow step status, error message, and timestamps
 * Timestamps are passed as parameters for flexibility
 * Includes WebSocket broadcasting for real-time updates
 */
export async function updateWorkflowStep(
  params: UpdateWorkflowStepParams
): Promise<WorkflowRunStep> {
  const { stepId, status, errorMessage, startedAt, completedAt, agentSessionId, logger } = params;

  logger?.debug(
    { stepId, status, hasError: !!errorMessage },
    'Updating workflow step'
  );

  const step = await prisma.workflowRunStep.update({
    where: { id: stepId },
    data: {
      ...(status !== undefined && { status }),
      ...(errorMessage !== undefined && { error_message: errorMessage }),
      ...(startedAt !== undefined && { started_at: startedAt }),
      ...(completedAt !== undefined && { completed_at: completedAt }),
      ...(agentSessionId !== undefined && { agent_session_id: agentSessionId }),
    },
    include: {
      workflow_run: true,
    },
  });

  logger?.debug({ stepId }, 'Workflow step updated');

  // Build changes object with only updated fields
  const changes: Record<string, unknown> = {};
  if (status !== undefined) changes.status = status;
  if (errorMessage !== undefined) changes.error_message = errorMessage;
  if (startedAt !== undefined) changes.started_at = startedAt;
  if (completedAt !== undefined) changes.completed_at = completedAt;
  if (agentSessionId !== undefined) changes.agent_session_id = agentSessionId;

  // Broadcast WebSocket event to project room
  if (Object.keys(changes).length > 0) {
    broadcastWorkflowEvent(step.workflow_run.project_id, {
      type: WorkflowWebSocketEventTypes.STEP_UPDATED,
      data: {
        run_id: step.workflow_run_id,
        step_id: stepId,
        changes,
      },
    });
  }

  return step;
}
