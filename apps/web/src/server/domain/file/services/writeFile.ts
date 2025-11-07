import fs from 'fs/promises';
import path from 'path';
import { getProjectById } from '@/server/domain/project/services/getProjectById';
import type { WriteFileOptions } from '../types/WriteFileOptions';

/**
 * Write file content
 * @param options - Write file options
 * @returns Success status
 */
export async function writeFile({ projectId, filePath, content }: WriteFileOptions): Promise<void> {
  // Look up project from database
  const project = await getProjectById({ id: projectId });

  if (!project) {
    throw new Error('Project not found');
  }

  // If filePath is not absolute, make it relative to project path
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(project.path, filePath);

  // Validate that the file is within the project directory (security check)
  const normalizedProjectPath = path.resolve(project.path);
  const normalizedFilePath = path.resolve(absolutePath);

  // Check if file is within project directory or is a child of it
  const relativePath = path.relative(normalizedProjectPath, normalizedFilePath);
  const isOutside = relativePath.startsWith('..') || path.isAbsolute(relativePath);

  if (isOutside) {
    throw new Error('Access denied: File is outside project directory');
  }

  // Write file content
  try {
    await fs.writeFile(absolutePath, content, 'utf-8');
  } catch {
    throw new Error('Failed to write file content');
  }
}
