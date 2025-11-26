import simpleGit from 'simple-git'
import type { UnstageFilesOptions } from '../types/UnstageFilesOptions'

/**
 * Unstage files
 */
export async function unstageFiles({ projectPath, files }: UnstageFilesOptions): Promise<void> {
  const git = simpleGit(projectPath);
  await git.reset(['HEAD', ...files]);
}
