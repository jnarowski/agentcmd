import fs from 'fs/promises';
import path from 'path';
import { getProjectById } from '@/server/domain/project/services/getProjectById';
import type { ReadFileOptions } from '../types/ReadFileOptions';

/**
 * Read file content
 * @param options - Read file options
 * @returns File content as string
 */
export async function readFile({ projectId, filePath }: ReadFileOptions): Promise<string> {
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

  // Check if file exists and is accessible
  try {
    await fs.access(absolutePath, fs.constants.R_OK);
  } catch {
    throw new Error('File not found or not accessible');
  }

  // Read file content
  try {
    const content = await fs.readFile(absolutePath, 'utf-8');
    return content;
  } catch {
    throw new Error('Failed to read file content');
  }
}
