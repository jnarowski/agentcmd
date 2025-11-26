import { prisma } from '@/shared/prisma';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type { UploadArtifactInput } from '../../types';
import type { WorkflowArtifact } from '@prisma/client';

/**
 * Upload an artifact file
 * - Validates file path is within project directory
 * - Saves file to filesystem (relative to project root)
 * - Creates WorkflowArtifact DB record with metadata
 * Returns null if execution not found
 */
export async function uploadArtifact(
  data: UploadArtifactInput,
  fileBuffer: Buffer
): Promise<WorkflowArtifact | null> {
  // Get the execution to access the project
  const execution = await prisma.workflowRun.findUnique({
    where: { id: data.workflow_run_id },
    include: {
      project: true,
    },
  });

  if (!execution) {
    return null;
  }

  const projectPath = execution.project.path;

  // Resolve absolute path and validate it's within project directory
  const absoluteFilePath = path.resolve(projectPath, data.file_path);
  if (!absoluteFilePath.startsWith(projectPath)) {
    throw new Error('File path must be within project directory');
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(absoluteFilePath);
  await fs.mkdir(parentDir, { recursive: true });

  // Write file to filesystem
  await fs.writeFile(absoluteFilePath, fileBuffer);

  // Create artifact record
  const artifact = await prisma.workflowArtifact.create({
    data: {
      workflow_run_id: data.workflow_run_id,
      name: data.name,
      file_path: data.file_path, // Store relative path
      file_type: data.file_type,
      mime_type: data.mime_type,
      size_bytes: data.size_bytes,
      phase: data.phase,
    },
  });

  return artifact;
}
