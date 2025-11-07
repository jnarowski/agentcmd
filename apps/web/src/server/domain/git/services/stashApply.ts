import simpleGit from 'simple-git'
import type { StashApplyOptions } from '../types/StashApplyOptions'

/**
 * Apply a stash without removing it
 */
export async function stashApply({ projectPath, index }: StashApplyOptions): Promise<void> {
  const git = simpleGit(projectPath);
  const args = ['apply'];
  if (index !== undefined) {
    args.push(`stash@{${index}}`);
  }
  await git.stash(args);
}
