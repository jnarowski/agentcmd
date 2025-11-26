import simpleGit from 'simple-git'
import type { GitStashEntry } from '@/shared/types/git.types'
import type { StashListOptions } from '../types/StashListOptions'

/**
 * List all stashes
 */
export async function stashList({ projectPath }: StashListOptions): Promise<GitStashEntry[]> {
  const git = simpleGit(projectPath);
  const result = await git.stashList();

  return result.all.map((stash, index) => ({
    index,
    message: stash.message,
    date: stash.date,
  }));
}
