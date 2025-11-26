import { prisma } from '@/shared/prisma';
import type { WorkflowArtifact } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

export type ArtifactFileType = 'text' | 'file' | 'image';

export interface CreateWorkflowArtifactData {
  workflow_run_id: string;
  name: string;
  file_type: ArtifactFileType;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  phase: string;
  inngest_step_id?: string;
  workflow_event_id?: string;
}

/**
 * Create a workflow artifact record
 * Artifacts are organized by phase (not by step)
 * Includes WebSocket broadcasting for real-time updates
 */
export async function createWorkflowArtifact(
  data: CreateWorkflowArtifactData,
  logger?: FastifyBaseLogger
): Promise<WorkflowArtifact> {
  logger?.debug(
    { name: data.name, fileType: data.file_type, phase: data.phase, inngestStepId: data.inngest_step_id, workflowEventId: data.workflow_event_id },
    'Creating workflow artifact'
  );

  const artifact = await prisma.workflowArtifact.create({
    data: {
      workflow_run_id: data.workflow_run_id,
      name: data.name,
      file_type: data.file_type,
      file_path: data.file_path,
      mime_type: data.mime_type,
      size_bytes: data.size_bytes,
      phase: data.phase,
      inngest_step_id: data.inngest_step_id,
      workflow_event_id: data.workflow_event_id,
    },
  });

  logger?.debug({ artifactId: artifact.id, phase: data.phase }, 'Workflow artifact created');

  // TODO: Add WebSocket broadcasting when event bus is available
  // eventBus.emit('workflow.artifact.created', { artifactId: artifact.id, phase: data.phase });

  return artifact;
}
