import fs from 'fs/promises';
import path from 'path';
import type { FileTreeItem } from '@/shared/types/file.types';
import { getProjectById } from '@/server/domain/project/services/getProjectById';
import type { GetFileTreeOptions } from '../types/GetFileTreeOptions';

const MAX_DEPTH = 10;
const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'coverage',
  '.turbo',
]);

/**
 * Convert Unix permissions to rwx format
 * @param mode - File mode from fs.stats
 * @returns Permission string (e.g., "rw-r--r--")
 */
function convertPermissions(mode: number): string {
  const perms = [
    (mode & 0o400) ? 'r' : '-',
    (mode & 0o200) ? 'w' : '-',
    (mode & 0o100) ? 'x' : '-',
    (mode & 0o040) ? 'r' : '-',
    (mode & 0o020) ? 'w' : '-',
    (mode & 0o010) ? 'x' : '-',
    (mode & 0o004) ? 'r' : '-',
    (mode & 0o002) ? 'w' : '-',
    (mode & 0o001) ? 'x' : '-',
  ];
  return perms.join('');
}

/**
 * Sort file tree: directories first, then alphabetically
 * @param items - File tree items to sort
 * @returns Sorted file tree items
 */
function sortFileTree(items: FileTreeItem[]): FileTreeItem[] {
  return items.sort((a, b) => {
    // Directories first
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;

    // Then alphabetically (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

/**
 * Recursively scan a directory
 * @param dirPath - Directory path to scan
 * @param depth - Current depth (for limiting recursion)
 * @returns Array of file tree items
 */
async function scanDirectory(
  dirPath: string,
  depth: number = 0
): Promise<FileTreeItem[]> {
  // Limit recursion depth
  if (depth > MAX_DEPTH) {
    return [];
  }

  const items: FileTreeItem[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip excluded directories
      if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      // Skip hidden files/dirs, except .agent and .claude (workflow directories)
      const isHidden = entry.name.startsWith('.');
      const isWorkflowDir = entry.name === '.agent' || entry.name === '.claude';
      if (isHidden && !isWorkflowDir) {
        continue;
      }

      try {
        // Get file stats for metadata
        const stats = await fs.stat(fullPath);

        const item: FileTreeItem = {
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stats.size : undefined,
          modified: stats.mtime,
          permissions: convertPermissions(stats.mode),
        };

        // Recursively scan subdirectories
        if (entry.isDirectory()) {
          item.children = await scanDirectory(fullPath, depth + 1);
        }

        items.push(item);
      } catch {
        // Skip files/dirs with permission errors
        continue;
      }
    }
  } catch {
    // Handle permission errors gracefully
  }

  return items;
}

/**
 * Get file tree for a project
 * @param options - Get file tree options
 * @returns File tree structure
 */
export async function getFileTree({ projectId }: GetFileTreeOptions): Promise<FileTreeItem[]> {
  // Look up project from database
  const project = await getProjectById({ id: projectId });

  if (!project) {
    throw new Error('Project not found');
  }

  // Validate that the path is accessible
  try {
    await fs.access(project.path);
  } catch {
    throw new Error('Project path is not accessible');
  }

  // Scan the directory
  const files = await scanDirectory(project.path, 0);

  // Sort: directories first, then alphabetically
  return sortFileTree(files);
}
