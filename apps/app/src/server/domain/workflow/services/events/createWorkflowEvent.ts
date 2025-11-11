import type { FastifyBaseLogger } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import type { WorkflowEvent, EventDataMap } from '@/server/domain/workflow/types';
import { broadcastWorkflowEvent } from './broadcastWorkflowEvent';
import { WorkflowWebSocketEventTypes } from '@/shared/types/websocket.types';

export interface CreateWorkflowEventParams<T extends keyof EventDataMap = keyof EventDataMap> {
  workflow_run_id: string;
  event_type: T;
  event_data: EventDataMap[T];
  phase?: string | null;
  inngest_step_id?: string;
  created_by_user_id?: string;
  created_at?: Date; // Optional: allow custom timestamp (for step_started events)
  logger?: FastifyBaseLogger;
}

/**
 * Create a new workflow event
 * Centralized function for consistent event creation across all workflow operations
 */
export async function createWorkflowEvent<T extends keyof EventDataMap>(
  params: CreateWorkflowEventParams<T>
): Promise<WorkflowEvent> {
  const {
    workflow_run_id,
    event_type,
    event_data,
    phase,
    inngest_step_id,
    created_by_user_id,
    created_at,
    logger,
  } = params;

  logger?.debug(
    {
      workflow_run_id,
      event_type,
      phase,
      inngest_step_id,
      event_data,
    },
    'Creating workflow event'
  );

  const event = await prisma.workflowEvent.create({
    data: {
      workflow_run_id,
      // @ts-ignore - event type
      event_type,
      event_data: event_data as unknown as Prisma.InputJsonValue,
      phase,
      inngest_step_id,
      created_by_user_id,
      ...(created_at && { created_at }),
    },
  });

  logger?.debug({ eventId: event.id, phase }, 'Workflow event created');

  // Get project_id for WebSocket emission
  const run = await prisma.workflowRun.findUnique({
    where: { id: workflow_run_id },
    select: { project_id: true },
  });

  // Emit event:created WebSocket event
  if (run) {
    broadcastWorkflowEvent(run.project_id, {
      type: WorkflowWebSocketEventTypes.EVENT_CREATED,
      data: {
        run_id: workflow_run_id,
        event: {
          id: event.id,
          workflow_run_id: event.workflow_run_id,
          event_type: event.event_type,
          event_data: event.event_data as unknown,
          phase: event.phase,
          inngest_step_id: event.inngest_step_id,
          created_by_user_id: event.created_by_user_id,
          created_at: event.created_at,
        },
      },
    });
  }

  return event;
}
