import simpleGit from 'simple-git'
import type { StashSaveOptions } from '../types/StashSaveOptions'

/**
 * Save current changes to stash
 */
export async function stashSave({ projectPath, message }: StashSaveOptions): Promise<void> {
  const git = simpleGit(projectPath);
  const args = ['push'];
  if (message) {
    args.push('-m', message);
  }
  await git.stash(args);
}
