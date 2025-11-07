import type { WorkflowArtifact } from "@prisma/client";
import { broadcastWorkflowEvent } from "../../../events/broadcastWorkflowEvent";

/**
 * Emit artifact:created event for a workflow artifact
 *
 * @param projectId - Project ID for event routing
 * @param runId - Workflow execution ID
 * @param artifact - Created artifact record
 *
 * @example
 * ```typescript
 * const artifact = await createWorkflowArtifact({ ... });
 * emitArtifactCreatedEvent(projectId, runId, artifact);
 * ```
 */
export function emitArtifactCreatedEvent(
  projectId: string,
  runId: string,
  artifact: WorkflowArtifact
): void {
  broadcastWorkflowEvent(projectId, {
    type: "workflow:run:artifact:created",
    data: {
      run_id: runId,
      artifact: {
        id: artifact.id,
        workflow_run_id: artifact.workflow_run_id,
        workflow_run_step_id: null,
        workflow_event_id: artifact.workflow_event_id,
        name: artifact.name,
        file_path: artifact.file_path,
        file_type: artifact.file_type,
        mime_type: artifact.mime_type,
        size_bytes: artifact.size_bytes,
        phase: artifact.phase,
        inngest_step_id: artifact.inngest_step_id,
        created_at: artifact.created_at,
      },
    },
  });
}
