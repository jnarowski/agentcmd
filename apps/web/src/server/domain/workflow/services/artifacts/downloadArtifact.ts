import { prisma } from '@/shared/prisma';
import * as path from 'node:path';
import type { WorkflowArtifact } from '@prisma/client';

/**
 * Get artifact by ID and resolve absolute file path
 * Returns artifact metadata + absolute file path for streaming
 * Returns null if artifact not found
 */
export async function downloadArtifact(
  id: string
): Promise<{ artifact: WorkflowArtifact; filePath: string } | null> {
  const artifact = await prisma.workflowArtifact.findUnique({
    where: { id },
    include: {
      workflow_run: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!artifact) {
    return null;
  }

  // Get project path from direct execution relationship
  const projectPath = artifact.workflow_run.project.path;

  // Resolve absolute file path
  const absoluteFilePath = path.resolve(projectPath, artifact.file_path);

  // Security: Validate path is within project directory
  if (!absoluteFilePath.startsWith(projectPath)) {
    throw new Error('Invalid file path - outside project directory');
  }

  return {
    artifact,
    filePath: absoluteFilePath,
  };
}
