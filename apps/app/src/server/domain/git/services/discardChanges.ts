import simpleGit from 'simple-git'
import type { DiscardChangesOptions } from '../types/DiscardChangesOptions'

/**
 * Discard changes for specific files
 */
export async function discardChanges({ projectPath, files }: DiscardChangesOptions): Promise<void> {
  const git = simpleGit(projectPath);
  await git.checkout(['--', ...files]);
}
