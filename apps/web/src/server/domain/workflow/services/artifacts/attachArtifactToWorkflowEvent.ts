import { prisma } from '@/shared/prisma';
import type { WorkflowArtifact } from '@prisma/client';
import { broadcastWorkflowEvent } from '../events/broadcastWorkflowEvent';

/**
 * Attach an artifact to an event
 * Validates event exists
 * Returns null if artifact not found or event not found
 * Emits artifact:created WebSocket event
 */
export async function attachArtifactToWorkflowEvent(
  artifactId: string,
  eventId: string
): Promise<WorkflowArtifact | null> {
  // Get artifact
  const artifact = await prisma.workflowArtifact.findUnique({
    where: { id: artifactId },
  });

  if (!artifact) {
    return null;
  }

  // Get event to validate it exists and get execution + project info
  const event = await prisma.workflowEvent.findUnique({
    where: { id: eventId },
    include: {
      workflow_run: {
        select: { id: true, project_id: true },
      },
    },
  });

  if (!event) {
    return null;
  }

  // Update artifact to attach to event
  const updatedArtifact = await prisma.workflowArtifact.update({
    where: { id: artifactId },
    data: {
      workflow_event_id: eventId,
    },
  });

  // Emit artifact:created WebSocket event
  broadcastWorkflowEvent(event.workflow_run.project_id, {
    type: 'workflow:run:artifact:created',
    data: {
      run_id: event.workflow_run.id,
      artifact: {
        id: updatedArtifact.id,
        workflow_run_id: updatedArtifact.workflow_run_id,
        workflow_run_step_id: null, // WorkflowArtifact doesn't have step_id - attached to events only
        workflow_event_id: updatedArtifact.workflow_event_id,
        name: updatedArtifact.name,
        file_path: updatedArtifact.file_path,
        file_type: updatedArtifact.file_type,
        mime_type: updatedArtifact.mime_type,
        size_bytes: updatedArtifact.size_bytes,
        phase: updatedArtifact.phase,
        inngest_step_id: updatedArtifact.inngest_step_id,
        created_at: updatedArtifact.created_at,
      },
    },
  });

  return updatedArtifact;
}
