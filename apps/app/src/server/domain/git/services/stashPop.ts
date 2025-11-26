import simpleGit from 'simple-git'
import type { StashPopOptions } from '../types/StashPopOptions'

/**
 * Pop the most recent stash
 */
export async function stashPop({ projectPath, index }: StashPopOptions): Promise<void> {
  const git = simpleGit(projectPath);
  const args = ['pop'];
  if (index !== undefined) {
    args.push(`stash@{${index}}`);
  }
  await git.stash(args);
}
