import { WorkflowEventType } from '@prisma/client';
import { prisma } from '@/shared/prisma';
import type { WorkflowEvent, EventDataMap } from '@/server/domain/workflow/types';
import { createWorkflowEvent, CreateWorkflowEventParams } from './createWorkflowEvent';

/**
 * Find existing workflow event or create new one if not found
 * Used for idempotent event creation when inngest_step_id is provided
 *
 * When inngest_step_id is provided:
 * - First checks if event already exists with that step ID
 * - Returns existing event if found (prevents duplicates on Inngest replay)
 * - Creates new event only if not found
 *
 * When inngest_step_id is NOT provided:
 * - Always creates new event (for user-generated events without step context)
 *
 * @param params - Event creation parameters
 * @returns Existing or newly created WorkflowEvent
 */
export async function findOrCreateWorkflowEvent<T extends keyof EventDataMap>(
  params: CreateWorkflowEventParams<T>
): Promise<WorkflowEvent> {
  const { workflow_run_id, inngest_step_id, event_type, logger } = params;

  // If no inngest_step_id, always create (no deduplication needed)
  if (!inngest_step_id) {
    return createWorkflowEvent(params);
  }

  // Try to find existing event with same inngest_step_id and event_type
  const existingEvent = await prisma.workflowEvent.findFirst({
    where: {
      workflow_run_id,
      inngest_step_id,
      event_type: event_type as WorkflowEventType,
    },
  });

  if (existingEvent) {
    logger?.debug(
      {
        eventId: existingEvent.id,
        inngest_step_id,
        event_type
      },
      'Event already exists, skipping creation'
    );
    return existingEvent;
  }

  // Create new event
  logger?.debug(
    { inngest_step_id, event_type },
    'Event not found, creating new event'
  );
  return createWorkflowEvent(params);
}
